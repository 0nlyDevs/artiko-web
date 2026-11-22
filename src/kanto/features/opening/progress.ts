/*
 * What the hairline at the bottom of the opening shows, as pure functions.
 * Its value is the share of the first screen that has really arrived: the
 * App chunk, the fonts, and the images the screen rendered. Nothing here is
 * timed, except the cap after which the page is revealed anyway.
 */

/** What the first screen needs, as the loader observed it so far. */
export interface LoadState {
  /** The App chunk has been evaluated. */
  appLoaded: boolean;
  /** The fonts of the opening and of the first screen have loaded, or settled without. */
  fontsReady: boolean;
  /**
   * Images of the first screen. `null` until the screen is in the document:
   * before that nobody knows which images it needs. A missing file counts as
   * settled.
   */
  images: { total: number; settled: number } | null;
}

export const INITIAL_LOAD_STATE: LoadState = {
  appLoaded: false,
  fontsReady: false,
  images: null,
};

/** Share of the bar given to each part. They add up to 1. */
export const PROGRESS_WEIGHTS = { app: 0.4, fonts: 0.2, images: 0.4 } as const;

/** The page is revealed after this long, whatever is still loading. */
export const OPENING_CAP_MS = 8000;

function imagesShare(images: LoadState['images']): number {
  if (images === null) {
    return 0;
  }
  if (images.total <= 0) {
    return 1;
  }
  return Math.min(1, Math.max(0, images.settled / images.total));
}

/** Real progress of the first screen, from 0 to 1. */
export function loadProgress(state: LoadState): number {
  return (
    (state.appLoaded ? PROGRESS_WEIGHTS.app : 0) +
    (state.fontsReady ? PROGRESS_WEIGHTS.fonts : 0) +
    imagesShare(state.images) * PROGRESS_WEIGHTS.images
  );
}

/** Everything the first screen needs has arrived or settled. */
export function isLoadComplete(state: LoadState): boolean {
  return (
    state.appLoaded &&
    state.fontsReady &&
    state.images !== null &&
    state.images.settled >= state.images.total
  );
}

/**
 * The value the bar shows next. It never moves backwards: an image found
 * late lowers the real share, and the bar then waits where it is.
 */
export function advanceProgress(shown: number, next: number): number {
  const clamped = Number.isFinite(next) ? Math.min(1, Math.max(0, next)) : 0;
  return Math.max(shown, clamped);
}

export interface RevealInput {
  state: LoadState;
  /** The five letters are in, or the visitor skipped them. */
  lettersDone: boolean;
  /** Time since the loader took control, in milliseconds. */
  elapsedMs: number;
}

/**
 * Whether the cover may open now. Loading is never skipped: only the cap
 * opens it early, and even the cap waits for the App chunk, because without
 * it there is no page to show.
 */
export function isRevealDue({
  state,
  lettersDone,
  elapsedMs,
}: RevealInput): boolean {
  if (!state.appLoaded) {
    return false;
  }
  if (elapsedMs >= OPENING_CAP_MS) {
    return true;
  }
  return lettersDone && isLoadComplete(state);
}
