import { beforeEach, describe, expect, it } from 'vitest';
import { placeArtworks, railBounds } from './gallery-layout';
import { goToWork, handleGalleryKey, stepWork } from './gallery-navigation';
import {
  galleryStore,
  input,
  rail,
  railTo,
  setRailBounds,
} from './gallery-store';
import type { SceneWork } from './scene-annex';

const WORKS: SceneWork[] = ['01', '02', '03'].map((number) => ({
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

function keydown(key: string, target?: HTMLElement): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    cancelable: true,
    bubbles: true,
  });
  // Dispatching gives the event its target, as the browser would.
  if (target !== undefined) {
    target.dispatchEvent(event);
  }
  return event;
}

describe('gallery navigation', () => {
  beforeEach(() => {
    galleryStore.reset();
    const bounds = railBounds(PLACED);
    setRailBounds(bounds.min, bounds.max);
    galleryStore.start(0, true);
    galleryStore.setActive(0);
    railTo(PLACED[0]?.x ?? 0);
  });

  it('steps from work to work and wraps at both ends of the wall', () => {
    stepWork(PLACED, -1);
    expect(galleryStore.getState().activeIndex).toBe(2);
    expect(rail.target).toBe(PLACED[2]?.x);
    stepWork(PLACED, 1);
    expect(galleryStore.getState().activeIndex).toBe(0);
  });

  it('steps between focused works without leaving the focus', () => {
    galleryStore.focus(2);
    stepWork(PLACED, 1);
    expect(galleryStore.getState()).toMatchObject({
      phase: 'focus',
      focusedIndex: 0,
    });
    stepWork(PLACED, -1);
    expect(galleryStore.getState()).toMatchObject({
      phase: 'focus',
      focusedIndex: 2,
    });
  });

  it('walks to a work and leaves any focus', () => {
    galleryStore.focus(1);
    goToWork(PLACED, 2);
    expect(galleryStore.getState()).toMatchObject({
      phase: 'visiting',
      activeIndex: 2,
    });
    expect(rail.target).toBe(PLACED[2]?.x);
  });

  it('maps the keyboard: arrows step, Enter comes close, Escape steps back', () => {
    handleGalleryKey(keydown('ArrowRight'), PLACED);
    expect(galleryStore.getState().activeIndex).toBe(1);

    const enter = keydown('Enter');
    handleGalleryKey(enter, PLACED);
    expect(enter.defaultPrevented).toBe(true);
    // Enter focuses the work in front of the visitor; the notice stays closed.
    expect(galleryStore.getState()).toMatchObject({
      phase: 'focus',
      focusedIndex: 1,
      noticeOpen: false,
    });

    handleGalleryKey(keydown('ArrowRight'), PLACED);
    expect(galleryStore.getState()).toMatchObject({
      phase: 'focus',
      focusedIndex: 2,
    });

    handleGalleryKey(keydown('Escape'), PLACED);
    expect(galleryStore.getState()).toMatchObject({
      phase: 'visiting',
      activeIndex: 2,
    });
  });

  it('comes close with the space bar too', () => {
    handleGalleryKey(keydown(' '), PLACED);
    expect(galleryStore.getState().phase).toBe('focus');
  });

  it('leaves Enter to the control that has the keyboard', () => {
    const button = document.createElement('button');
    document.body.append(button);
    const enter = keydown('Enter', button);
    handleGalleryKey(enter, PLACED);
    expect(enter.defaultPrevented).toBe(false);
    expect(galleryStore.getState().phase).toBe('visiting');
    button.remove();
  });

  it('ignores Enter and Escape during the entrance', () => {
    galleryStore.reset();
    galleryStore.start(0);
    handleGalleryKey(keydown('Enter'), PLACED);
    handleGalleryKey(keydown('Escape'), PLACED);
    expect(galleryStore.getState().phase).toBe('entering');
  });

  it('ignores keys while a dialog holds the input', () => {
    input.locked = true;
    handleGalleryKey(keydown('ArrowRight'), PLACED);
    handleGalleryKey(keydown('Enter'), PLACED);
    expect(galleryStore.getState()).toMatchObject({
      phase: 'visiting',
      activeIndex: 0,
    });
  });

  it('gives Escape to the dialog first, then to the focus', () => {
    galleryStore.focus(1);
    // The notice is open: the page locks the input, the dialog closes itself.
    galleryStore.openNotice();
    input.locked = true;
    handleGalleryKey(keydown('Escape'), PLACED);
    expect(galleryStore.getState()).toMatchObject({
      phase: 'focus',
      noticeOpen: true,
    });

    galleryStore.closeNotice();
    input.locked = false;
    expect(galleryStore.getState().phase).toBe('focus');
    handleGalleryKey(keydown('Escape'), PLACED);
    expect(galleryStore.getState().phase).toBe('visiting');
  });
});
