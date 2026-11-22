import { describe, expect, it } from 'vitest';
import type { LoadState } from './progress';
import {
  advanceProgress,
  INITIAL_LOAD_STATE,
  isLoadComplete,
  isRevealDue,
  loadProgress,
  OPENING_CAP_MS,
  PROGRESS_WEIGHTS,
} from './progress';

const loaded: LoadState = {
  appLoaded: true,
  fontsReady: true,
  images: { total: 4, settled: 4 },
};

describe('progress of the opening', () => {
  it('gives the three parts weights that add up to the whole bar', () => {
    const total =
      PROGRESS_WEIGHTS.app + PROGRESS_WEIGHTS.fonts + PROGRESS_WEIGHTS.images;
    expect(total).toBeCloseTo(1, 10);
    expect(loadProgress(INITIAL_LOAD_STATE)).toBe(0);
    expect(loadProgress(loaded)).toBeCloseTo(1, 10);
  });

  it('counts each part for its weight', () => {
    expect(loadProgress({ ...INITIAL_LOAD_STATE, appLoaded: true })).toBeCloseTo(
      PROGRESS_WEIGHTS.app,
      10,
    );
    expect(loadProgress({ ...INITIAL_LOAD_STATE, fontsReady: true })).toBeCloseTo(
      PROGRESS_WEIGHTS.fonts,
      10,
    );
    expect(
      loadProgress({
        ...INITIAL_LOAD_STATE,
        images: { total: 4, settled: 1 },
      }),
    ).toBeCloseTo(PROGRESS_WEIGHTS.images / 4, 10);
  });

  it('counts the images only once the screen is known, and a screen without images as done', () => {
    expect(loadProgress({ ...INITIAL_LOAD_STATE, images: null })).toBe(0);
    expect(
      loadProgress({ ...INITIAL_LOAD_STATE, images: { total: 0, settled: 0 } }),
    ).toBeCloseTo(PROGRESS_WEIGHTS.images, 10);
  });

  it('is complete only when the chunk, the fonts and every image have settled', () => {
    expect(isLoadComplete(loaded)).toBe(true);
    expect(isLoadComplete({ ...loaded, appLoaded: false })).toBe(false);
    expect(isLoadComplete({ ...loaded, fontsReady: false })).toBe(false);
    expect(isLoadComplete({ ...loaded, images: null })).toBe(false);
    expect(
      isLoadComplete({ ...loaded, images: { total: 4, settled: 3 } }),
    ).toBe(false);
    expect(
      isLoadComplete({ ...loaded, images: { total: 0, settled: 0 } }),
    ).toBe(true);
  });

  it('never moves the bar backwards', () => {
    expect(advanceProgress(0.2, 0.6)).toBe(0.6);
    // An image found late lowers the real share: the bar waits where it is.
    expect(advanceProgress(0.6, 0.45)).toBe(0.6);

    const states: LoadState[] = [
      INITIAL_LOAD_STATE,
      { ...INITIAL_LOAD_STATE, appLoaded: true },
      { appLoaded: true, fontsReady: false, images: { total: 1, settled: 1 } },
      { appLoaded: true, fontsReady: false, images: { total: 5, settled: 1 } },
      { appLoaded: true, fontsReady: true, images: { total: 5, settled: 3 } },
      loaded,
    ];
    let shown = 0;
    for (const state of states) {
      const next = advanceProgress(shown, loadProgress(state));
      expect(next).toBeGreaterThanOrEqual(shown);
      shown = next;
    }
    expect(shown).toBeCloseTo(1, 10);
  });

  it('keeps the bar between empty and full', () => {
    expect(advanceProgress(0, -1)).toBe(0);
    expect(advanceProgress(0, 3)).toBe(1);
    expect(advanceProgress(0.3, Number.NaN)).toBe(0.3);
  });
});

describe('when the cover opens', () => {
  it('opens once everything is loaded and the letters are in', () => {
    expect(isRevealDue({ state: loaded, lettersDone: true, elapsedMs: 900 })).toBe(
      true,
    );
  });

  it('waits for the letters when the page loads faster than they come in', () => {
    expect(isRevealDue({ state: loaded, lettersDone: false, elapsedMs: 300 })).toBe(
      false,
    );
  });

  it('keeps loading when the letters are in first: skipping them never skips the loading', () => {
    const waiting: LoadState = { ...loaded, images: { total: 4, settled: 2 } };
    expect(isRevealDue({ state: waiting, lettersDone: true, elapsedMs: 1500 })).toBe(
      false,
    );
  });

  it('opens at the cap whatever is still missing, a font or an image', () => {
    const stuck: LoadState = {
      appLoaded: true,
      fontsReady: false,
      images: { total: 4, settled: 1 },
    };
    expect(
      isRevealDue({ state: stuck, lettersDone: true, elapsedMs: OPENING_CAP_MS - 1 }),
    ).toBe(false);
    expect(
      isRevealDue({ state: stuck, lettersDone: true, elapsedMs: OPENING_CAP_MS }),
    ).toBe(true);
    // Even before the letters, and before the first screen is known.
    expect(
      isRevealDue({
        state: { appLoaded: true, fontsReady: false, images: null },
        lettersDone: false,
        elapsedMs: OPENING_CAP_MS,
      }),
    ).toBe(true);
  });

  it('never opens on nothing: the cap still waits for the App chunk', () => {
    expect(
      isRevealDue({
        state: INITIAL_LOAD_STATE,
        lettersDone: true,
        elapsedMs: OPENING_CAP_MS * 3,
      }),
    ).toBe(false);
  });

  it('caps the wait at about eight seconds', () => {
    expect(OPENING_CAP_MS).toBeGreaterThanOrEqual(7000);
    expect(OPENING_CAP_MS).toBeLessThanOrEqual(9000);
  });
});
