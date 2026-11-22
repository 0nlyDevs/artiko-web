import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { ROOM, clamp, dollyRange, nearestIndex } from './gallery-layout';
import type { PlacedArtwork } from './gallery-layout';
import { handleGalleryKey } from './gallery-navigation';
import {
  dollyBy,
  dollyTo,
  galleryStore,
  input,
  lens,
  moveRail,
  rail,
  railTo,
  setSpinVelocity,
  spin,
  turnBy,
} from './gallery-store';
import type { GalleryState } from './gallery-store';

interface GalleryControlsProps {
  readonly placed: readonly PlacedArtwork[];
}

/** Metres travelled per wheel pixel. */
const WHEEL_GAIN = 0.0045;
/** Metres travelled when dragging across the whole canvas width. */
const DRAG_SWEEP = 7.5;
/** Idle time after the last wheel tick before settling on a work. */
const SNAP_DELAY_MS = 320;
/** Fraction of the spacing a gesture must cover to move to the next work. */
const STEP_THRESHOLD = 0.12;
/** Radians a focused object turns per pixel of horizontal drag. */
const YAW_PER_PIXEL = 0.008;
/** Radians it leans per pixel of vertical drag. */
const PITCH_PER_PIXEL = 0.005;
/** A drag that paused this long before the release leaves no inertia. */
const FLICK_WINDOW_MS = 90;
/** Share of the newest pointer sample in the yaw speed kept for the inertia. */
const VELOCITY_BLEND = 0.6;
/** Dolly per wheel pixel in focus. A trackpad pinch reports smaller deltas. */
const DOLLY_WHEEL_GAIN = 0.0014;
const DOLLY_PINCH_GAIN = 0.01;
/** One wheel event never dollies further than this many pixels would. */
const DOLLY_MAX_DELTA = 240;

/**
 * Where a gesture ends: from the work it started on, one step per spacing
 * travelled in its direction, and at least one step past the threshold.
 * A slow mouse wheel therefore advances notch by notch instead of being
 * pulled back, while a long swipe skips several works.
 */
export function settleIndex(
  placed: readonly PlacedArtwork[],
  anchorIndex: number,
  targetX: number,
): number {
  const anchor = placed[anchorIndex];
  if (!anchor) {
    return nearestIndex(placed, targetX);
  }
  const travelled = targetX - anchor.x;
  const progress = Math.abs(travelled) / ROOM.spacing;
  if (progress < STEP_THRESHOLD) {
    return anchorIndex;
  }
  const steps = Math.max(1, Math.round(progress));
  return clamp(
    anchorIndex + Math.sign(travelled) * steps,
    0,
    placed.length - 1,
  );
}

interface Point {
  x: number;
  y: number;
}

/**
 * Input of the room, on the canvas element. In the visit, wheel and drag
 * move the rail. In the focus they never do: a drag turns a 3D work
 * directly, with one finger or the mouse, and the wheel or a pinch brings
 * the camera closer. The keyboard is shared with the page. Returns the
 * function that removes every listener.
 *
 * A click is told from a drag by the scene itself (the works and
 * `onPointerMissed` ignore a pointer that travelled), so turning an object
 * never leaves the focus.
 */
export function attachGalleryControls(
  element: HTMLElement,
  placed: readonly PlacedArtwork[],
): () => void {
  const pointers = new Map<number, Point>();
  /** The pointer that moves the rail or turns the object. */
  let primary: number | null = null;
  let lastX = 0;
  let lastY = 0;
  let lastTime = 0;
  let dragged = false;
  let pinch: { distance: number; dolly: number } | null = null;
  let wheelTimer: number | null = null;
  let anchorIndex = 0;

  /** The work in focus, if any. */
  const focusedWork = (state: GalleryState): PlacedArtwork | undefined =>
    state.phase === 'focus' && state.focusedIndex !== null
      ? placed[state.focusedIndex]
      : undefined;

  const turnable = (state: GalleryState): boolean =>
    focusedWork(state)?.kind === 'sculpture';

  const beginGesture = (): void => {
    anchorIndex = nearestIndex(placed, rail.target);
  };

  /** Settles the visitor in front of a work once the gesture ends. */
  const settle = (): void => {
    wheelTimer = null;
    if (galleryStore.getState().phase !== 'visiting') {
      return;
    }
    const index = settleIndex(placed, anchorIndex, rail.target);
    const work = placed[index];
    if (work) {
      railTo(work.x);
      galleryStore.setActive(index);
    }
  };

  /** Distance between the first two fingers on the canvas. */
  const spread = (): number => {
    const [a, b] = [...pointers.values()];
    return a && b ? Math.hypot(b.x - a.x, b.y - a.y) : 0;
  };

  const onWheel = (event: WheelEvent): void => {
    if (input.locked) {
      return;
    }
    const state = galleryStore.getState();
    if (state.phase === 'focus') {
      event.preventDefault();
      const work = focusedWork(state);
      if (work) {
        const delta = clamp(event.deltaY, -DOLLY_MAX_DELTA, DOLLY_MAX_DELTA);
        const gain = event.ctrlKey ? DOLLY_PINCH_GAIN : DOLLY_WHEEL_GAIN;
        dollyBy(Math.exp(delta * gain), dollyRange(work.kind));
      }
      return;
    }
    if (state.phase !== 'visiting') {
      return;
    }
    event.preventDefault();
    if (wheelTimer === null) {
      beginGesture();
    } else {
      window.clearTimeout(wheelTimer);
    }
    const delta =
      Math.abs(event.deltaX) > Math.abs(event.deltaY)
        ? event.deltaX
        : event.deltaY;
    moveRail(delta * WHEEL_GAIN);
    wheelTimer = window.setTimeout(settle, SNAP_DELAY_MS);
  };

  const onPointerDown = (event: PointerEvent): void => {
    if (input.locked) {
      return;
    }
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }
    if (event.isPrimary) {
      // A first finger starts afresh, whatever a lost pointer left behind.
      pointers.clear();
      pinch = null;
    }
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const state = galleryStore.getState();
    if (pointers.size === 1) {
      primary = event.pointerId;
      lastX = event.clientX;
      lastY = event.clientY;
      lastTime = event.timeStamp;
      dragged = false;
      if (state.phase === 'visiting') {
        beginGesture();
      } else if (turnable(state)) {
        spin.dragging = true;
        spin.velocity = 0;
      }
    } else if (pointers.size === 2 && state.phase === 'focus') {
      // Two fingers dolly the camera; the turn waits until both are up.
      primary = null;
      spin.dragging = false;
      spin.velocity = 0;
      pinch = { distance: spread(), dolly: lens.dolly };
    }
  };

  const onPointerMove = (event: PointerEvent): void => {
    const point = pointers.get(event.pointerId);
    if (point === undefined) {
      return;
    }
    point.x = event.clientX;
    point.y = event.clientY;
    if (pinch !== null) {
      const distance = spread();
      const work = focusedWork(galleryStore.getState());
      if (!input.locked && work && distance > 0 && pinch.distance > 0) {
        dollyTo(
          (pinch.dolly * pinch.distance) / distance,
          dollyRange(work.kind),
        );
      }
      return;
    }
    if (primary !== event.pointerId) {
      return;
    }
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    const elapsed = event.timeStamp - lastTime;
    lastX = event.clientX;
    lastY = event.clientY;
    lastTime = event.timeStamp;
    if (dx !== 0 || dy !== 0) {
      dragged = true;
    }
    if (input.locked) {
      return;
    }
    const state = galleryStore.getState();
    if (state.phase === 'visiting') {
      moveRail((-dx / Math.max(element.clientWidth, 1)) * DRAG_SWEEP);
    } else if (turnable(state)) {
      const yaw = dx * YAW_PER_PIXEL;
      turnBy(yaw, dy * PITCH_PER_PIXEL);
      if (elapsed > 0) {
        const sample = (yaw / elapsed) * 1000;
        setSpinVelocity(
          spin.velocity + (sample - spin.velocity) * VELOCITY_BLEND,
        );
      }
    }
  };

  const release = (event: PointerEvent): void => {
    if (!pointers.delete(event.pointerId)) {
      return;
    }
    if (pinch !== null) {
      if (pointers.size === 0) {
        pinch = null;
      }
      return;
    }
    if (primary !== event.pointerId) {
      return;
    }
    primary = null;
    if (spin.dragging) {
      spin.dragging = false;
      if (event.timeStamp - lastTime > FLICK_WINDOW_MS) {
        spin.velocity = 0;
      }
    }
    if (dragged) {
      settle();
    }
  };

  const onKey = (event: KeyboardEvent): void => {
    handleGalleryKey(event, placed);
  };

  element.addEventListener('wheel', onWheel, { passive: false });
  element.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);
  window.addEventListener('keydown', onKey);
  return () => {
    if (wheelTimer !== null) {
      window.clearTimeout(wheelTimer);
    }
    spin.dragging = false;
    element.removeEventListener('wheel', onWheel);
    element.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', release);
    window.removeEventListener('pointercancel', release);
    window.removeEventListener('keydown', onKey);
  };
}

/** Wires the input of the room to the canvas, and removes it with it. */
export function GalleryControls({ placed }: GalleryControlsProps) {
  const gl = useThree((state) => state.gl);

  useEffect(
    () => attachGalleryControls(gl.domElement, placed),
    [gl, placed],
  );

  return null;
}
