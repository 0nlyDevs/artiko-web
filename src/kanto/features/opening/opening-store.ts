import { useSyncExternalStore } from 'react';
import { isMuseumPath } from './boot';

/*
 * State of the opening that plays once, on a full page load. The loader
 * writes it; the shell and the first screen read it.
 *
 * - `none`: no cover on screen. Tests, client-side navigations and every
 *   moment after the opening are in this phase, so nothing ever waits for a
 *   loader that is not there.
 * - `boot`: a full load of a museum address. A black wall covers the page
 *   until the museum shows its own loading screen. Nothing waits for it.
 * - `loading`: the ivory loader is up and the first screen loads under it.
 * - `revealing`: the cover opens. The first screen plays its entrance now.
 */
export type OpeningPhase = 'none' | 'boot' | 'loading' | 'revealing';

type Listener = () => void;

let phase: OpeningPhase = 'none';
let begun = false;
const listeners = new Set<Listener>();
const revealListeners = new Set<Listener>();

let appLoaded = false;
const appListeners = new Set<Listener>();

function setPhase(next: OpeningPhase): void {
  if (phase === next) {
    return;
  }
  const wasWaiting = phase === 'loading';
  phase = next;
  if (wasWaiting) {
    // Leaving `loading` in any direction releases the screens that waited.
    const waiting = [...revealListeners];
    revealListeners.clear();
    for (const listener of waiting) {
      listener();
    }
  }
  for (const listener of [...listeners]) {
    listener();
  }
}

/**
 * Starts the opening of this document. The shell calls it once, when its
 * module loads in the browser, which only a full page load does. Later calls
 * are ignored, so the opening never replays.
 */
export function beginOpening(pathname: string): void {
  if (begun) {
    return;
  }
  begun = true;
  setPhase(isMuseumPath(pathname) ? 'boot' : 'loading');
}

/** The cover starts to open: the first screen may play its entrance. */
export function startReveal(): void {
  if (phase === 'loading') {
    setPhase('revealing');
  }
}

/** The cover is gone, or was dropped (a redirect into the museum). */
export function endOpening(): void {
  setPhase('none');
}

export function getOpeningPhase(): OpeningPhase {
  return phase;
}

/** True unless a loader is still covering the page. */
export function hasRevealStarted(): boolean {
  return phase !== 'loading';
}

/**
 * Calls back once the reveal has started: at once, synchronously, when no
 * loader covers the page, otherwise when the cover starts to open. Returns a
 * function that withdraws the callback.
 */
export function onRevealStart(callback: Listener): () => void {
  if (hasRevealStarted()) {
    callback();
    return () => undefined;
  }
  revealListeners.add(callback);
  return () => {
    revealListeners.delete(callback);
  };
}

export function subscribeOpening(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The server always renders the ivory loader: it cannot know the address. */
function getServerPhase(): OpeningPhase {
  return 'loading';
}

export function useOpeningPhase(): OpeningPhase {
  return useSyncExternalStore(subscribeOpening, getOpeningPhase, getServerPhase);
}

/** The App chunk has been evaluated. Called by the shell's dynamic import. */
export function markAppLoaded(): void {
  if (appLoaded) {
    return;
  }
  appLoaded = true;
  const waiting = [...appListeners];
  appListeners.clear();
  for (const listener of waiting) {
    listener();
  }
}

export function isAppLoaded(): boolean {
  return appLoaded;
}

/** Calls back once the App chunk is loaded, at once when it already is. */
export function onAppLoaded(callback: Listener): () => void {
  if (appLoaded) {
    callback();
    return () => undefined;
  }
  appListeners.add(callback);
  return () => {
    appListeners.delete(callback);
  };
}

/** Test helper: back to a document where no opening ever started. */
export function resetOpening(): void {
  phase = 'none';
  begun = false;
  appLoaded = false;
  revealListeners.clear();
  appListeners.clear();
  for (const listener of [...listeners]) {
    listener();
  }
}
