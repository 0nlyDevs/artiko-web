import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  beginOpening,
  endOpening,
  getOpeningPhase,
  hasRevealStarted,
  isAppLoaded,
  markAppLoaded,
  onAppLoaded,
  onRevealStart,
  resetOpening,
  startReveal,
  subscribeOpening,
} from './opening-store';

describe('opening store', () => {
  beforeEach(() => {
    resetOpening();
  });

  afterEach(() => {
    resetOpening();
  });

  it('reports the reveal as started when no loader is present, so nothing waits', () => {
    expect(getOpeningPhase()).toBe('none');
    expect(hasRevealStarted()).toBe(true);

    const callback = vi.fn();
    onRevealStart(callback);
    // Synchronously: a client-side navigation or a test starts its entrance in the same tick.
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('holds the first screen while the loader is up, and releases it when the reveal starts', () => {
    beginOpening('/');
    expect(getOpeningPhase()).toBe('loading');
    expect(hasRevealStarted()).toBe(false);

    const first = vi.fn();
    const second = vi.fn();
    onRevealStart(first);
    onRevealStart(second);
    expect(first).not.toHaveBeenCalled();

    startReveal();
    expect(getOpeningPhase()).toBe('revealing');
    expect(hasRevealStarted()).toBe(true);
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);

    // Whoever asks afterwards is answered at once, and the first callers are not called again.
    const late = vi.fn();
    onRevealStart(late);
    expect(late).toHaveBeenCalledTimes(1);
    endOpening();
    expect(first).toHaveBeenCalledTimes(1);
    expect(getOpeningPhase()).toBe('none');
  });

  it('does not call back a screen that withdrew before the reveal', () => {
    beginOpening('/contribuer');
    const callback = vi.fn();
    const withdraw = onRevealStart(callback);
    withdraw();
    startReveal();
    expect(callback).not.toHaveBeenCalled();
  });

  it('releases the waiting screens when the opening is dropped without a reveal', () => {
    beginOpening('/');
    const callback = vi.fn();
    onRevealStart(callback);
    endOpening();
    expect(callback).toHaveBeenCalledTimes(1);
    expect(hasRevealStarted()).toBe(true);
  });

  it('starts no loader on a museum address: a black wall, and nothing waits', () => {
    beginOpening('/musee/peinture/01');
    expect(getOpeningPhase()).toBe('boot');
    expect(hasRevealStarted()).toBe(true);

    const callback = vi.fn();
    onRevealStart(callback);
    expect(callback).toHaveBeenCalledTimes(1);

    // The reveal of the ivory loader has no meaning there.
    startReveal();
    expect(getOpeningPhase()).toBe('boot');
  });

  it('begins once per document: a later call never replays the opening', () => {
    beginOpening('/');
    startReveal();
    endOpening();
    expect(getOpeningPhase()).toBe('none');

    beginOpening('/');
    expect(getOpeningPhase()).toBe('none');
  });

  it('tells its subscribers about every phase', () => {
    const phases: string[] = [];
    const unsubscribe = subscribeOpening(() => {
      phases.push(getOpeningPhase());
    });
    beginOpening('/oeuvres');
    startReveal();
    endOpening();
    unsubscribe();
    expect(phases).toEqual(['loading', 'revealing', 'none']);
  });

  it('answers at once when the App chunk is loaded, and later callers too', () => {
    const early = vi.fn();
    onAppLoaded(early);
    expect(isAppLoaded()).toBe(false);
    expect(early).not.toHaveBeenCalled();

    markAppLoaded();
    markAppLoaded();
    expect(isAppLoaded()).toBe(true);
    expect(early).toHaveBeenCalledTimes(1);

    const late = vi.fn();
    onAppLoaded(late);
    expect(late).toHaveBeenCalledTimes(1);
  });
});
