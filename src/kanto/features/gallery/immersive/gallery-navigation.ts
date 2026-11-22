import { nearestIndex } from './gallery-layout';
import type { PlacedArtwork } from './gallery-layout';
import { galleryStore, input, rail, railTo } from './gallery-store';

/*
 * Discrete navigation shared by the 3D controls and the page: stepping from
 * work to work, wrapping at both ends of the wall like the photographic
 * room does, and the keyboard map. Dialogs own the keyboard while open.
 */

export function stepWork(
  placed: readonly PlacedArtwork[],
  direction: 1 | -1,
): void {
  const state = galleryStore.getState();
  if (placed.length === 0) {
    return;
  }
  if (state.phase === 'visiting') {
    const current = nearestIndex(placed, rail.target);
    const next = (current + direction + placed.length) % placed.length;
    const work = placed[next];
    if (work) {
      railTo(work.x);
      galleryStore.setActive(next);
    }
  } else if (state.phase === 'focus') {
    const next =
      ((state.focusedIndex ?? state.activeIndex) + direction + placed.length) %
      placed.length;
    galleryStore.focus(next);
  }
}

/** Moves the visitor in front of a work, leaving any focus. */
export function goToWork(
  placed: readonly PlacedArtwork[],
  index: number,
): void {
  const work = placed[index];
  if (!work) {
    return;
  }
  if (galleryStore.getState().phase === 'focus') {
    galleryStore.unfocus();
  }
  railTo(work.x);
  galleryStore.setActive(index);
}

function isInteractive(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return (
    target.isContentEditable ||
    ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(target.tagName)
  );
}

/**
 * The keyboard of the room. Arrows step from work to work, in the visit and
 * in the focus. Enter or Space comes close to the work in front of the
 * visitor, unless a control has the keyboard. Escape leaves the focus; an
 * open dialog takes Escape first, because it holds the input.
 */
export function handleGalleryKey(
  event: KeyboardEvent,
  placed: readonly PlacedArtwork[],
): void {
  const state = galleryStore.getState();
  if (input.locked || state.phase === 'entering') {
    return;
  }
  switch (event.key) {
    case 'ArrowRight':
      event.preventDefault();
      stepWork(placed, 1);
      break;
    case 'ArrowLeft':
      event.preventDefault();
      stepWork(placed, -1);
      break;
    case 'Escape':
      if (state.phase === 'focus') {
        galleryStore.unfocus();
      }
      break;
    case 'Enter':
    case ' ':
      if (state.phase === 'visiting' && !isInteractive(event.target)) {
        event.preventDefault();
        galleryStore.focus(state.activeIndex);
      }
      break;
    default:
      break;
  }
}
