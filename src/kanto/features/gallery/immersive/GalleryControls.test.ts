import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { attachGalleryControls, settleIndex } from './GalleryControls';
import {
  ROOM,
  dollyRange,
  placeArtworks,
  railBounds,
} from './gallery-layout';
import {
  PITCH_MAX,
  galleryStore,
  input,
  lens,
  rail,
  railTo,
  setRailBounds,
  spin,
} from './gallery-store';
import type { SceneWork } from './scene-annex';

const WORKS: SceneWork[] = ['01', '02', '03', '04'].map((number) => ({
  id: `peinture/${number}`,
  roomSlug: 'peinture',
  roomIndex: 0,
  artworkIndex: Number(number) - 1,
  kind: 'painting',
  width: 0.7,
  height: 0.9,
  image: null,
  model: null,
}));
const PLACED = placeArtworks(WORKS);
const x = (index: number): number => PLACED[index]?.x ?? 0;

describe('settleIndex', () => {
  it('stays on the anchor work after a small gesture', () => {
    expect(settleIndex(PLACED, 1, x(1) + ROOM.spacing * 0.05)).toBe(1);
    expect(settleIndex(PLACED, 1, x(1) - ROOM.spacing * 0.1)).toBe(1);
  });

  it('moves one work past the threshold, even before the halfway point', () => {
    expect(settleIndex(PLACED, 1, x(1) + ROOM.spacing * 0.2)).toBe(2);
    expect(settleIndex(PLACED, 1, x(1) - ROOM.spacing * 0.4)).toBe(0);
  });

  it('skips several works after a long swipe and stops at the ends', () => {
    expect(settleIndex(PLACED, 0, x(0) + ROOM.spacing * 2.4)).toBe(2);
    expect(settleIndex(PLACED, 1, x(1) + ROOM.spacing * 6)).toBe(3);
    expect(settleIndex(PLACED, 2, x(2) - ROOM.spacing * 6)).toBe(0);
  });

  it('falls back to the nearest work without an anchor', () => {
    expect(settleIndex(PLACED, 9, x(3))).toBe(3);
  });
});

/*
 * The input of the room on a stand-in for the canvas. A wall of two
 * paintings then a 3D work, so the focus of both kinds is covered.
 */
const ROOM_WORKS: SceneWork[] = [
  { ...WORKS[0], id: 'peinture/01' },
  { ...WORKS[1], id: 'peinture/02' },
  {
    id: 'sculpture/01',
    roomSlug: 'sculpture',
    roomIndex: 1,
    artworkIndex: 0,
    kind: 'sculpture',
    width: 0.3,
    height: 0.37,
    image: null,
    model: null,
  },
] as SceneWork[];
const ROOM_PLACED = placeArtworks(ROOM_WORKS);
const SCULPTURE = 2;
const roomX = (index: number): number => ROOM_PLACED[index]?.x ?? 0;

interface PointerInit {
  id?: number;
  type?: string;
  primary?: boolean;
  button?: number;
}

describe('gallery controls', () => {
  let canvas: HTMLDivElement;
  let detach: () => void;

  const pointer = (
    name: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel',
    clientX: number,
    clientY: number,
    { id = 1, type = 'mouse', primary = true, button = 0 }: PointerInit = {},
  ): void => {
    const event = new PointerEvent(name, {
      pointerId: id,
      pointerType: type,
      isPrimary: primary,
      button,
      clientX,
      clientY,
      bubbles: true,
      cancelable: true,
    });
    // The room listens to the press on the canvas and to the rest on the window.
    (name === 'pointerdown' ? canvas : window).dispatchEvent(event);
  };

  const drag = (dx: number, dy: number, init?: PointerInit): void => {
    pointer('pointerdown', 200, 200, init);
    pointer('pointermove', 200 + dx / 2, 200 + dy / 2, init);
    pointer('pointermove', 200 + dx, 200 + dy, init);
    pointer('pointerup', 200 + dx, 200 + dy, init);
  };

  const wheel = (deltaY: number, init: WheelEventInit = {}): WheelEvent => {
    const event = new WheelEvent('wheel', {
      deltaY,
      bubbles: true,
      cancelable: true,
      ...init,
    });
    canvas.dispatchEvent(event);
    return event;
  };

  beforeEach(() => {
    galleryStore.reset();
    const bounds = railBounds(ROOM_PLACED);
    setRailBounds(bounds.min, bounds.max);
    galleryStore.start(0, true);
    galleryStore.setActive(1);
    railTo(roomX(1));
    canvas = document.createElement('div');
    document.body.append(canvas);
    detach = attachGalleryControls(canvas, ROOM_PLACED);
  });

  afterEach(() => {
    detach();
    canvas.remove();
  });

  it('moves the rail with the wheel and with a drag while visiting', () => {
    const event = wheel(120);
    expect(event.defaultPrevented).toBe(true);
    expect(rail.target).toBeGreaterThan(roomX(1));

    railTo(roomX(1));
    drag(-80, 0);
    // The gesture settles in front of a work, further along the wall.
    expect(rail.target).toBe(roomX(2));
    expect(galleryStore.getState().activeIndex).toBe(2);
  });

  it('never moves the rail in the focus: the wheel dollies the camera instead', () => {
    galleryStore.focus(1);
    const before = rail.target;
    const event = wheel(-120);
    expect(event.defaultPrevented).toBe(true);
    expect(rail.target).toBe(before);
    expect(lens.dolly).toBeLessThan(1);

    for (let notch = 0; notch < 40; notch += 1) {
      wheel(-120);
    }
    expect(lens.dolly).toBe(dollyRange('painting')[0]);
    for (let notch = 0; notch < 40; notch += 1) {
      wheel(120);
    }
    expect(lens.dolly).toBe(dollyRange('painting')[1]);
    expect(rail.target).toBe(before);

    // An object may come closer than a painting.
    galleryStore.focus(SCULPTURE);
    for (let notch = 0; notch < 40; notch += 1) {
      wheel(-120);
    }
    expect(lens.dolly).toBe(dollyRange('sculpture')[0]);
    expect(lens.dolly).toBeLessThan(dollyRange('painting')[0]);
  });

  it('turns a focused 3D work directly with a drag, and leaves the rail alone', () => {
    galleryStore.focus(SCULPTURE);
    const before = rail.target;
    drag(100, 40);
    expect(spin.yaw).toBeGreaterThan(0.5);
    expect(spin.pitch).toBeGreaterThan(0);
    expect(spin.dragging).toBe(false);
    expect(rail.target).toBe(before);
    expect(galleryStore.getState()).toMatchObject({
      phase: 'focus',
      focusedIndex: SCULPTURE,
    });

    const turned = spin.yaw;
    drag(-300, 0);
    expect(spin.yaw).toBeLessThan(turned);
  });

  it('holds the object while the pointer is down', () => {
    galleryStore.focus(SCULPTURE);
    pointer('pointerdown', 200, 200);
    expect(spin.dragging).toBe(true);
    pointer('pointerup', 200, 200);
    expect(spin.dragging).toBe(false);
    // A press without a move is a click: nothing turned.
    expect(spin.yaw).toBe(0);
  });

  it('keeps the pitch of a long vertical drag within its range', () => {
    galleryStore.focus(SCULPTURE);
    drag(0, 4000);
    expect(spin.pitch).toBe(PITCH_MAX);
    expect(spin.yaw).toBe(0);
  });

  it('turns with one finger', () => {
    galleryStore.focus(SCULPTURE);
    drag(60, 0, { id: 7, type: 'touch' });
    expect(spin.yaw).toBeGreaterThan(0);
  });

  it('dollies with two fingers instead of turning', () => {
    galleryStore.focus(SCULPTURE);
    pointer('pointerdown', 150, 200, { id: 7, type: 'touch' });
    pointer('pointerdown', 250, 200, { id: 8, type: 'touch', primary: false });
    // The fingers move apart, from 100 to 125 pixels: the camera comes closer.
    pointer('pointermove', 140, 200, { id: 7, type: 'touch' });
    pointer('pointermove', 265, 200, { id: 8, type: 'touch', primary: false });
    expect(lens.dolly).toBeCloseTo(0.8);
    expect(spin.yaw).toBe(0);

    // One finger stays down: it does not start turning the object.
    pointer('pointerup', 265, 200, { id: 8, type: 'touch', primary: false });
    pointer('pointermove', 20, 200, { id: 7, type: 'touch' });
    expect(spin.yaw).toBe(0);
    pointer('pointerup', 20, 200, { id: 7, type: 'touch' });

    // Both are up: the next finger turns again.
    drag(60, 0, { id: 9, type: 'touch' });
    expect(spin.yaw).toBeGreaterThan(0);
  });

  it('does not turn a focused painting', () => {
    galleryStore.focus(0);
    const before = rail.target;
    drag(160, 60);
    expect(spin).toMatchObject({ yaw: 0, pitch: 0, dragging: false });
    expect(rail.target).toBe(before);
  });

  it('ignores the right mouse button', () => {
    galleryStore.focus(SCULPTURE);
    drag(100, 0, { button: 2 });
    expect(spin.yaw).toBe(0);
  });

  it('leaves everything alone while a dialog holds the input', () => {
    input.locked = true;
    const event = wheel(120);
    expect(event.defaultPrevented).toBe(false);
    drag(-80, 0);
    expect(rail.target).toBe(roomX(1));

    input.locked = false;
    galleryStore.focus(SCULPTURE);
    input.locked = true;
    drag(100, 40);
    wheel(-120);
    expect(spin).toMatchObject({ yaw: 0, pitch: 0 });
    expect(lens.dolly).toBe(1);
  });

  it('stops turning when a dialog opens under the finger', () => {
    galleryStore.focus(SCULPTURE);
    pointer('pointerdown', 200, 200);
    pointer('pointermove', 220, 200);
    const turned = spin.yaw;
    input.locked = true;
    pointer('pointermove', 320, 200);
    expect(spin.yaw).toBe(turned);
    pointer('pointerup', 320, 200);
    expect(spin.dragging).toBe(false);
  });

  it('listens to the keyboard: Enter comes close, Escape steps back', () => {
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }),
    );
    expect(galleryStore.getState()).toMatchObject({
      phase: 'focus',
      focusedIndex: 1,
      noticeOpen: false,
    });
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(galleryStore.getState().phase).toBe('visiting');
  });

  it('removes every listener when the canvas goes', () => {
    galleryStore.focus(SCULPTURE);
    detach();
    drag(100, 40);
    wheel(-120);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(spin.yaw).toBe(0);
    expect(lens.dolly).toBe(1);
    expect(galleryStore.getState().phase).toBe('focus');
  });
});
