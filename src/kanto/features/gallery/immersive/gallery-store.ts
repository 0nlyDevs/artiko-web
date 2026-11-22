import { useSyncExternalStore } from 'react';
import { clamp, damp, nearestTurn } from './gallery-layout';

/*
 * The visit is a small, deterministic state machine:
 *
 *   entering --introDone()--> visiting --focus(i)--> focus --unfocus()--> visiting
 *
 * The notice is a flag beside it: it opens from the visit (the wall label)
 * or from the focus (the caption), and closing it leaves the phase as it
 * was, so the visitor returns to where they were.
 *
 * Continuous values that change every frame (the rail position, the turn of
 * a focused object and the dolly of the camera) live outside React state,
 * in `rail`, `spin` and `lens`, so the 3D loop never triggers renders. The
 * store only holds discrete UI state. Dialogs set `input.locked` so the room
 * ignores wheel, drag and keys.
 */

export type GalleryPhase = 'entering' | 'visiting' | 'focus';

export type MediaStatus = 'loading' | 'ready' | 'missing';

export interface GalleryState {
  readonly phase: GalleryPhase;
  /** Index of the work in front of the visitor. */
  readonly activeIndex: number;
  readonly focusedIndex: number | null;
  readonly hoveredIndex: number | null;
  /** The notice panel is open beside the room. */
  readonly noticeOpen: boolean;
  /** When the travelling started, from performance.now(), or null before it. */
  readonly introStartedAt: number | null;
  readonly media: Readonly<Record<string, MediaStatus>>;
}

type Listener = () => void;

const INITIAL_STATE: GalleryState = {
  phase: 'entering',
  activeIndex: 0,
  focusedIndex: null,
  hoveredIndex: null,
  noticeOpen: false,
  introStartedAt: null,
  media: {},
};

const listeners = new Set<Listener>();
let state: GalleryState = INITIAL_STATE;

function setState(patch: Partial<GalleryState>): void {
  state = { ...state, ...patch };
  for (const listener of listeners) {
    listener();
  }
}

function getState(): GalleryState {
  return state;
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Visitor position along the wall, in metres. Mutated by controls, read by the frame loop. */
export const rail = { target: 0, current: 0, min: 0, max: 0 };

/**
 * Where the visitor has turned the focused object, in radians: `yaw` around
 * its vertical axis and `pitch` towards the visitor. `velocity` is the yaw
 * speed left by the last drag, in radians per second.
 */
export const spin = { yaw: 0, pitch: 0, velocity: 0, dragging: false };

/** Dolly of the camera in focus, as a share of the fitted distance. */
export const lens = { dolly: 1 };

/**
 * Measured diameter of each loaded object seen from above, in metres, by
 * work id. A measure of the file, not of the visit: it outlives a reset.
 */
export const footprints = new Map<string, number>();

/** True while a dialog is open: the room then ignores wheel, drag and keys. */
export const input = { locked: false };

/** One press of a turn button. */
export const TURN_STEP = Math.PI / 6;
/**
 * Pitch range. Leaning the object back is kept small, so the underside,
 * which is not scanned, never faces the visitor.
 */
export const PITCH_MIN = -0.12;
export const PITCH_MAX = 0.5;
/** Fastest yaw a flick can leave, in radians per second. */
export const SPIN_MAX_VELOCITY = 5;
/** How fast the yaw left by a drag dies out. */
const SPIN_FRICTION = 5;

export function setRailBounds(min: number, max: number): void {
  rail.min = min;
  rail.max = max;
  rail.target = Math.min(max, Math.max(min, rail.target));
  rail.current = Math.min(max, Math.max(min, rail.current));
}

export function moveRail(delta: number): void {
  rail.target = Math.min(rail.max, Math.max(rail.min, rail.target + delta));
}

export function railTo(x: number): void {
  rail.target = Math.min(rail.max, Math.max(rail.min, x));
}

/** Turns the focused object by a drag: any yaw, a pitch kept within its range. */
export function turnBy(yaw: number, pitch: number): void {
  spin.yaw += yaw;
  spin.pitch = clamp(spin.pitch + pitch, PITCH_MIN, PITCH_MAX);
}

/** Turns the focused object by one step, for the buttons of the caption. */
export function turnStep(direction: 1 | -1): void {
  spin.velocity = 0;
  spin.yaw += direction * TURN_STEP;
}

/** Brings the object back to its resting orientation by the shortest way, and the camera to its fitted distance. */
export function resetView(): void {
  spin.velocity = 0;
  spin.yaw = nearestTurn(spin.yaw);
  spin.pitch = 0;
  lens.dolly = 1;
}

/** Records the yaw speed of a drag, which the object keeps for a moment once released. */
export function setSpinVelocity(velocity: number): void {
  spin.velocity = clamp(velocity, -SPIN_MAX_VELOCITY, SPIN_MAX_VELOCITY);
}

/**
 * One frame of inertia: a released object keeps turning and slows down.
 * Reduced motion stops it where the visitor left it.
 */
export function advanceSpin(dt: number, reducedMotion: boolean): void {
  if (spin.dragging) {
    return;
  }
  if (reducedMotion || Math.abs(spin.velocity) < 0.01) {
    spin.velocity = 0;
    return;
  }
  spin.yaw += spin.velocity * dt;
  spin.velocity = damp(spin.velocity, 0, SPIN_FRICTION, dt);
}

/**
 * Moves the camera of the focus closer (below 1) or farther, within the
 * range of the focused work (dollyRange).
 */
export function dollyBy(factor: number, range: readonly [number, number]): void {
  dollyTo(lens.dolly * factor, range);
}

export function dollyTo(dolly: number, range: readonly [number, number]): void {
  lens.dolly = clamp(dolly, range[0], range[1]);
}

/** Forgets how the last focused work was turned and framed. */
function restView(): void {
  spin.yaw = 0;
  spin.pitch = 0;
  spin.velocity = 0;
  spin.dragging = false;
  lens.dolly = 1;
}

export const galleryStore = {
  getState,
  subscribe,

  /** Starts the travelling into the room, or lands directly on the rail. */
  start(now: number = performance.now(), skipIntro = false): void {
    setState(
      skipIntro
        ? { phase: 'visiting', introStartedAt: now }
        : { phase: 'entering', introStartedAt: now },
    );
  },

  introDone(): void {
    if (state.phase !== 'entering') {
      return;
    }
    setState({ phase: 'visiting' });
  },

  setActive(index: number): void {
    if (state.activeIndex !== index) {
      setState({ activeIndex: index });
    }
  },

  setHovered(index: number | null): void {
    if (state.hoveredIndex !== index) {
      setState({ hoveredIndex: index });
    }
  },

  /** Comes close to a work. From another focused work, the focus moves to it. */
  focus(index: number): void {
    if (state.phase === 'entering') {
      return;
    }
    if (state.phase === 'focus' && state.focusedIndex === index) {
      return;
    }
    restView();
    setState({
      phase: 'focus',
      focusedIndex: index,
      activeIndex: index,
      hoveredIndex: null,
    });
  },

  /** Steps back to the rail, in front of the work that was in focus. */
  unfocus(): void {
    if (state.phase !== 'focus') {
      return;
    }
    restView();
    setState({ phase: 'visiting', focusedIndex: null });
  },

  /** Opens the notice of the current work. The phase does not change. */
  openNotice(): void {
    if (state.phase === 'entering' || state.noticeOpen) {
      return;
    }
    setState({ noticeOpen: true, hoveredIndex: null });
  },

  /** Closes the notice: the visitor is back in the focus or in the visit. */
  closeNotice(): void {
    if (!state.noticeOpen) {
      return;
    }
    setState({ noticeOpen: false });
  },

  setMediaStatus(id: string, status: MediaStatus): void {
    if (state.media[id] === status) {
      return;
    }
    setState({ media: { ...state.media, [id]: status } });
  },

  /** Forgets the visit, for unmounts and tests. */
  reset(): void {
    rail.target = 0;
    rail.current = 0;
    rail.min = 0;
    rail.max = 0;
    restView();
    input.locked = false;
    state = INITIAL_STATE;
    for (const listener of listeners) {
      listener();
    }
  },
};

/** The work the camera frames: the focused one, or the one in front of the visitor. */
export function subjectIndex(current: GalleryState): number {
  return current.focusedIndex ?? current.activeIndex;
}

export function useGallery(): GalleryState {
  return useSyncExternalStore(subscribe, getState, () => INITIAL_STATE);
}
