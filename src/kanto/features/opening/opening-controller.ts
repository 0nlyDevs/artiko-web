import { waitForFonts } from '../../lib/motion/fonts';
import { prefersReducedMotion } from '../../lib/motion/reduced-motion';
import { OPENING_FONT_FAMILY } from './boot';
import { watchFirstScreen } from './first-screen';
import { endOpening, onAppLoaded, startReveal } from './opening-store';
import type { LoadState } from './progress';
import {
  advanceProgress,
  INITIAL_LOAD_STATE,
  isRevealDue,
  loadProgress,
  OPENING_CAP_MS,
} from './progress';
import type { RevealElements } from './reveal';
import { playReveal } from './reveal';

export interface OpeningElements extends RevealElements {
  /** The part of the hairline that shows real progress. */
  fill: HTMLElement;
  /** Where the app renders the first screen. */
  app: HTMLElement;
}

/** The face the letters wait for, as a CSS font shorthand. */
const OPENING_FONT = `400 72px "${OPENING_FONT_FAMILY}"`;

/** The whole word rests this long once its last letter is in, before the cover opens. */
export const WORD_REST_MS = 100;

/** The CSS animations that bring the letters in. Empty under reduced motion. */
function letterAnimations(word: HTMLElement): Animation[] {
  return typeof word.getAnimations === 'function'
    ? word.getAnimations({ subtree: true })
    : [];
}

/**
 * Takes control of the opening once the client bundle runs. The letters and
 * the creeping hairline are CSS and were already playing; from here the
 * hairline follows what the first screen really needs, and the cover opens
 * when all of it has arrived and the five letters are in.
 *
 * Returns the function that stops everything.
 */
export function runOpening(elements: OpeningElements): () => void {
  const { fill, word, app } = elements;
  const startedAt = performance.now();
  const stops: (() => void)[] = [];
  let state: LoadState = INITIAL_LOAD_STATE;
  let shown = 0;
  let lettersDone = false;
  let fontsAsked = false;
  let revealing = false;
  let stopped = false;

  const stopWaiting = (): void => {
    for (const stop of stops.splice(0)) {
      stop();
    }
  };

  const reveal = (): void => {
    revealing = true;
    stopWaiting();
    stops.push(
      playReveal(elements, {
        reducedMotion: prefersReducedMotion(),
        onComplete: endOpening,
      }),
    );
    // The first screen plays its entrance now, seen through the opening cover.
    startReveal();
  };

  const update = (): void => {
    if (stopped || revealing) {
      return;
    }
    shown = advanceProgress(shown, loadProgress(state));
    fill.style.transform = `scaleX(${String(shown)})`;
    const elapsedMs = performance.now() - startedAt;
    if (isRevealDue({ state, lettersDone, elapsedMs })) {
      reveal();
    }
  };

  const set = (patch: Partial<LoadState>): void => {
    state = { ...state, ...patch };
    update();
  };

  // 1. The App chunk.
  stops.push(
    onAppLoaded(() => {
      set({ appLoaded: true });
    }),
  );

  // 2. The first screen, then its images and the fonts it asked for.
  stops.push(
    watchFirstScreen(app, (images) => {
      if (!fontsAsked) {
        fontsAsked = true;
        const remaining = OPENING_CAP_MS - (performance.now() - startedAt);
        void waitForFonts([OPENING_FONT], Math.max(0, remaining)).then(() => {
          set({ fontsReady: true });
        });
      }
      set({ images });
    }),
  );

  // 3. The five letters, then a short rest on the whole word. A click or a
  // key ends that wait at once, never the loading.
  const animations = letterAnimations(word);
  let restTimer = 0;
  const lettersIn = (): void => {
    lettersDone = true;
    update();
  };
  void Promise.allSettled(
    animations.map((animation) => animation.finished),
  ).then(() => {
    if (animations.length === 0) {
      lettersIn();
    } else if (!lettersDone) {
      restTimer = window.setTimeout(lettersIn, WORD_REST_MS);
    }
  });
  const skipLetters = (): void => {
    for (const animation of animations) {
      try {
        animation.finish();
      } catch {
        // An animation that cannot finish (already cancelled) is not waited for.
      }
    }
    lettersIn();
  };
  window.addEventListener('pointerdown', skipLetters);
  window.addEventListener('keydown', skipLetters);
  stops.push(() => {
    window.clearTimeout(restTimer);
    window.removeEventListener('pointerdown', skipLetters);
    window.removeEventListener('keydown', skipLetters);
  });

  // 4. The cap: past it, the page is revealed with what it has.
  const capTimer = window.setTimeout(update, OPENING_CAP_MS);
  stops.push(() => {
    window.clearTimeout(capTimer);
  });

  update();

  return () => {
    stopped = true;
    stopWaiting();
  };
}
