import type { RefObject } from 'react';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { waitForFonts } from '../../lib/motion/fonts';
import { gsap, SplitText, useGSAP } from '../../lib/motion/gsap';
import { useContextSafe } from '../../lib/motion/use-context-safe';

/** Fonts the headline and the copy need before SplitText measures the lines. */
const HANGING_FONTS = [
  '400 64px "New Icon Serif"',
  '500 15px "Helvetica Now Display"',
];

/** The lamp over the work at rest, and while the visitor is close to it. */
const SPOT_REST = 0.82;
const SPOT_NEAR = 1;
/** The warm halo around the work: when the visitor is close, and on impact. */
const GLOW_NEAR = 0.5;
const GLOW_IMPACT = 0.7;
/** CSS variable the stylesheet reads to light the work itself, from 0 to 1. */
const LAMP = '--lamp';

/** The empty stand stays in the light until then, at least. */
const DROP_AT = 2.1;
/** A fall from rest: constant acceleration over this time. */
const FALL = 0.62;
/** The text starts once the work has settled on its stand. */
const COPY_AFTER_IMPACT = 0.55;
/** From the eyebrow to the wall label, the last to appear. */
const COPY_LENGTH = 2;

/**
 * Wall-clock limit of the sequence. GSAP smooths long frames, so a machine
 * that draws a few frames per second would otherwise keep the text hidden.
 */
const SEQUENCE_DEADLINE_MS = 16000;
/** A cover that never lifts does not hold the ceremony back longer than this. */
const COVER_LIMIT_MS = 12000;

const DECOR_ON = '[data-h="scene"], [data-h="stand"], [data-h="work"]';
const COPY =
  '[data-h="eyebrow"], [data-h="headline"], [data-h="paragraph"], [data-h="actions"] > *, [data-h="cartel"]';

/** Black towards the museum, ivory towards a hall page. */
export type ExitTone = 'museum' | 'hall';

interface CeremonyOptions {
  reducedMotion: boolean;
  /** The work is on its stand: it can be reached and turned. */
  onLanded: () => void;
  /** The sequence is over, played to its end or skipped. */
  onDone: () => void;
}

export interface HangingCeremony {
  /** The work is loaded and drawn: it may drop once the stand had its moment. */
  release: () => void;
  /** Jumps to the final state. */
  skip: () => void;
  /** The lamp goes out and the screen fades, before the visitor leaves. */
  leave: (tone: ExitTone) => Promise<void>;
  /**
   * The lamp follows the visitor: brighter as they come close to the work
   * (1 on it), back to rest as they move away (0).
   */
  approach: (level: number) => void;
}

type Selector = (selector: string) => Element[];
type Phase = 'playing' | 'done' | 'leaving';

interface Gate {
  promise: Promise<void>;
  open: () => void;
}

function createGate(): Gate {
  let open = (): void => undefined;
  const promise = new Promise<void>((resolve) => {
    open = resolve;
  });
  return { promise, open };
}

/**
 * Resolves once no ancestor keeps the page inert. A full page load plays the
 * opening of the site over the app, which is inert until that cover is gone:
 * the ceremony starts then, not hidden behind it. Client-side navigations
 * have no cover and start at once.
 */
function whenUncovered(element: HTMLElement): {
  promise: Promise<void>;
  cancel: () => void;
} {
  const cover = element.closest('[inert]');
  if (cover === null || typeof MutationObserver !== 'function') {
    return { promise: Promise.resolve(), cancel: () => undefined };
  }
  let cancel = (): void => undefined;
  const promise = new Promise<void>((resolve) => {
    const observer = new MutationObserver(() => {
      if (element.closest('[inert]') === null) {
        cancel();
        resolve();
      }
    });
    const timer = window.setTimeout(() => {
      cancel();
      resolve();
    }, COVER_LIMIT_MS);
    cancel = () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
    observer.observe(cover, { attributes: true, attributeFilter: ['inert'] });
  });
  return { promise, cancel };
}

/** One set unit in CSS pixels, read from the probe of the stylesheet. */
function setUnit(q: Selector): number {
  const probe = q('[data-h="probe"]')[0];
  const width = probe instanceof HTMLElement ? probe.offsetWidth : 0;
  return width > 0 ? width / 100 : 1;
}

/* Everything starts dark. Text keeps its place in the accessibility tree:
   only its opacity is animated. */
function darken(q: Selector): void {
  gsap.set(
    q(`${DECOR_ON}, [data-h="spot"], [data-h="flare"], [data-h="shadow"]`),
    { autoAlpha: 0 },
  );
  gsap.set(q(COPY), { opacity: 0 });
  gsap.set(q('[data-h="actions"]'), { pointerEvents: 'none' });
}

/** The final state, whatever was playing. */
function settle(q: Selector, split: SplitText | null): void {
  split?.revert();
  gsap.set(q(DECOR_ON), { autoAlpha: 1 });
  gsap.set(q('[data-h="spot"]'), { autoAlpha: SPOT_REST });
  gsap.set(q('[data-h="flare"], [data-h="template"]'), { autoAlpha: 0 });
  gsap.set(q('[data-h="work"]'), { [LAMP]: 0 });
  gsap.set(q('[data-h="shadow"]'), { autoAlpha: 1, scaleX: 1 });
  gsap.set(q('[data-h="stand"]'), { scale: 1 });
  gsap.set(q('[data-h="work"]'), { y: 0 });
  gsap.set(q('[data-h="sway"]'), { rotation: 0 });
  gsap.set(q(COPY), { opacity: 1, y: 0 });
  gsap.set(q('[data-h="actions"]'), { pointerEvents: 'auto' });
}

type Step = gsap.TweenVars & { duration: number };

/**
 * Plays tweens of one target one after the other, from `at`. Each gets its
 * own time: a tween added without one would start at the end of the whole
 * timeline, after whatever else is already in it.
 */
function chain(
  tl: gsap.core.Timeline,
  targets: Element[],
  at: number,
  steps: readonly Step[],
): void {
  let time = at;
  for (const step of steps) {
    tl.to(targets, step, time);
    time += step.duration;
  }
}

/* The wall appears, the spot warms up like a lamp as in the rooms, then the
   empty stand shows in the light. */
function lightRoom(tl: gsap.core.Timeline, q: Selector): void {
  tl.to(
    q('[data-h="scene"]'),
    { autoAlpha: 1, duration: 0.9, ease: 'power2.out' },
    0,
  );
  chain(tl, q('[data-h="spot"]'), 0.45, [
    { autoAlpha: 0.55 * SPOT_REST, duration: 0.22, ease: 'power1.in' },
    { autoAlpha: 0.38 * SPOT_REST, duration: 0.08, ease: 'none' },
    { autoAlpha: SPOT_REST, duration: 0.7, ease: 'power2.out' },
  ]);
  tl.fromTo(
    q('[data-h="stand"]'),
    { autoAlpha: 0, scale: 0.985 },
    { autoAlpha: 1, scale: 1, duration: 0.9, ease: 'power3.out' },
    0.75,
  );
}

/*
 * The work drops from above the top edge and lands. A work standing on the
 * plinth has a short rebound; a hung one pulls on its cord and sways. On
 * impact the contact shadow appears and the lamp flares, then settles.
 * Returns the time of the impact.
 */
function dropWork(tl: gsap.core.Timeline, q: Selector, at: number): number {
  const work = q('[data-h="work"]');
  const sway = q('[data-h="sway"]');
  const spot = q('[data-h="spot"]');
  const element = work[0];
  const kind = element instanceof HTMLElement ? element.dataset['kind'] : '';
  const stands = kind === 'model' || kind === 'poster';
  const unit = setUnit(q);
  const height =
    element === undefined
      ? window.innerHeight
      : element.getBoundingClientRect().bottom + 48;
  const impact = at + FALL;

  tl.set(work, { autoAlpha: 1 }, at);
  tl.fromTo(
    work,
    { y: -height },
    { y: 0, duration: FALL, ease: 'power1.in' },
    at,
  );
  if (stands) {
    chain(tl, work, impact, [
      { y: -5 * unit, duration: 0.1, ease: 'power2.out' },
      { y: 0, duration: 0.13, ease: 'power2.in' },
      { y: -1.4 * unit, duration: 0.07, ease: 'power2.out' },
      { y: 0, duration: 0.08, ease: 'power2.in' },
    ]);
    chain(tl, sway, impact, [
      { rotation: 0.7, duration: 0.11, ease: 'sine.out' },
      { rotation: -0.4, duration: 0.17, ease: 'sine.inOut' },
      { rotation: 0.16, duration: 0.16, ease: 'sine.inOut' },
      { rotation: 0, duration: 0.18, ease: 'sine.inOut' },
    ]);
  } else {
    chain(tl, work, impact, [
      { y: 8 * unit, duration: 0.08, ease: 'power2.out' },
      { y: -2.5 * unit, duration: 0.2, ease: 'sine.inOut' },
      { y: 0, duration: 0.24, ease: 'sine.inOut' },
    ]);
    chain(tl, sway, impact, [
      { rotation: 1.3, duration: 0.16, ease: 'sine.out' },
      { rotation: -0.75, duration: 0.26, ease: 'sine.inOut' },
      { rotation: 0.32, duration: 0.24, ease: 'sine.inOut' },
      { rotation: 0, duration: 0.24, ease: 'sine.inOut' },
    ]);
  }
  tl.fromTo(
    q('[data-h="shadow"]'),
    { autoAlpha: 0, scaleX: 0.6 },
    { autoAlpha: 1, scaleX: 1, duration: 0.18, ease: 'power2.out' },
    impact - 0.03,
  );
  tl.to(
    q('[data-h="template"]'),
    { autoAlpha: 0, duration: 0.25, ease: 'power1.out' },
    impact,
  );
  chain(tl, spot, impact, [
    { autoAlpha: 1, duration: 0.1, ease: 'power2.out' },
    { autoAlpha: SPOT_REST, duration: 0.9, ease: 'power2.out' },
  ]);
  tl.set(q('[data-h="flare"]'), { autoAlpha: 0 }, at);
  chain(tl, q('[data-h="flare"]'), impact, [
    { autoAlpha: GLOW_IMPACT, duration: 0.1, ease: 'power2.out' },
    { autoAlpha: 0, duration: 0.85, ease: 'power2.out' },
  ]);
  // The work itself catches the light when it lands.
  chain(tl, work, impact, [
    { [LAMP]: 1, duration: 0.1, ease: 'power2.out' },
    { [LAMP]: 0, duration: 0.9, ease: 'power2.out' },
  ]);
  return impact;
}

/* After the landing: the headline rises line by line behind its masks, then
   the paragraph, the buttons and the wall label beside the work. */
function revealCopy(
  tl: gsap.core.Timeline,
  q: Selector,
  at: number,
  splitRef: RefObject<SplitText | null>,
): void {
  const headline = q('[data-h="headline"]');
  const actions = q('[data-h="actions"]');
  const split = new SplitText(headline, {
    type: 'lines',
    mask: 'lines',
    aria: 'none',
  });
  splitRef.current = split;

  tl.fromTo(
    q('[data-h="eyebrow"]'),
    { opacity: 0, y: 8 },
    { opacity: 1, y: 0, duration: 0.6, ease: 'expo.out' },
    at,
  );
  tl.set(headline, { opacity: 1 }, at);
  tl.fromTo(
    split.lines,
    { yPercent: 130 },
    { yPercent: 0, duration: 1.05, ease: 'expo.out', stagger: 0.12 },
    at + 0.05,
  );
  tl.fromTo(
    q('[data-h="paragraph"]'),
    { opacity: 0, y: 10 },
    { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out' },
    at + 0.6,
  );
  tl.fromTo(
    q('[data-h="actions"] > *'),
    { opacity: 0, y: 10 },
    { opacity: 1, y: 0, duration: 0.7, ease: 'expo.out', stagger: 0.1 },
    at + 0.9,
  );
  tl.set(actions, { pointerEvents: 'auto' }, at + 1);
  tl.fromTo(
    q('[data-h="cartel"]'),
    { opacity: 0, y: 8 },
    { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' },
    at + 1.3,
  );
}

/**
 * The hanging ceremony: from black, the room lights up and the empty stand
 * waits in the spot; the work drops from above and lands; then the headline,
 * the paragraph, the buttons and the wall label appear. About 5 s, longer
 * when the work is slow to load. Reduced motion shows the final state with a
 * 0.3 s fade. The returned object is stable across renders.
 */
export function useHangingCeremony(
  rootRef: RefObject<HTMLElement | null>,
  { reducedMotion, onLanded, onDone }: CeremonyOptions,
): HangingCeremony {
  const callbacksRef = useRef({ onLanded, onDone });
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const splitRef = useRef<SplitText | null>(null);
  const phaseRef = useRef<Phase>('playing');
  const exitRef = useRef<Promise<void> | null>(null);
  const nearRef = useRef(0);
  const [gate] = useState(createGate);

  const complete = (root: HTMLElement): void => {
    if (phaseRef.current !== 'playing') {
      return;
    }
    phaseRef.current = 'done';
    root.dataset['motion'] = 'done';
    callbacksRef.current.onLanded();
    callbacksRef.current.onDone();
  };

  const skip = useContextSafe(rootRef, () => {
    const root = rootRef.current;
    if (root === null || phaseRef.current !== 'playing') {
      return;
    }
    timelineRef.current?.kill();
    timelineRef.current = null;
    const q = gsap.utils.selector(root);
    const veil = q('[data-h="veil"]');
    gsap.killTweensOf(veil);
    gsap.set(veil, { autoAlpha: 0 });
    settle(q, splitRef.current);
    splitRef.current = null;
    complete(root);
  });

  const playExit = useContextSafe(
    rootRef,
    (tone: ExitTone, resolve: () => void) => {
      const root = rootRef.current;
      if (root === null) {
        resolve();
        return;
      }
      phaseRef.current = 'leaving';
      root.dataset['motion'] = 'leaving';
      timelineRef.current?.kill();
      timelineRef.current = null;
      const q = gsap.utils.selector(root);
      const veil = q('[data-h="veil"]');
      for (const element of veil) {
        if (element instanceof HTMLElement) {
          element.dataset['tone'] = tone;
        }
      }
      const fade = reducedMotion ? 0.25 : 0.5;
      let left = false;
      const done = (): void => {
        if (!left) {
          left = true;
          window.clearTimeout(timer);
          resolve();
        }
      };
      // The visitor leaves even when no frame is drawn, in a hidden tab.
      const timer = window.setTimeout(done, (fade + 0.7) * 1000);
      const tl = gsap.timeline({ onComplete: done });
      if (!reducedMotion) {
        tl.to(
          q('[data-h="spot"], [data-h="flare"]'),
          { autoAlpha: 0, duration: 0.32, ease: 'power2.in' },
          0,
        );
      }
      tl.to(
        veil,
        {
          autoAlpha: 1,
          duration: fade,
          ease: reducedMotion ? 'none' : 'power2.inOut',
        },
        reducedMotion ? 0 : 0.1,
      );
    },
  );

  const approach = useContextSafe(rootRef, (level: number) => {
    const root = rootRef.current;
    if (root === null || phaseRef.current !== 'done') {
      return;
    }
    // Twenty steps are enough for the eye and keep a moving pointer cheap.
    const near = Math.round(Math.min(1, Math.max(0, level)) * 20) / 20;
    if (near === nearRef.current) {
      return;
    }
    // The lamp comes up faster than it goes down, like the spots of the rooms.
    const duration = reducedMotion ? 0.2 : near > nearRef.current ? 0.45 : 0.8;
    nearRef.current = near;
    const q = gsap.utils.selector(root);
    gsap.to(q('[data-h="spot"]'), {
      autoAlpha: SPOT_REST + (SPOT_NEAR - SPOT_REST) * near,
      duration,
      ease: 'power2.out',
      overwrite: 'auto',
    });
    gsap.to(q('[data-h="flare"]'), {
      autoAlpha: GLOW_NEAR * near,
      duration,
      ease: 'power2.out',
      overwrite: 'auto',
    });
    gsap.to(q('[data-h="work"]'), {
      [LAMP]: near,
      duration,
      ease: 'power2.out',
      overwrite: 'auto',
    });
  });

  // The stable object below always runs the handlers of the last commit.
  const handlersRef = useRef({ skip, playExit, approach });
  useLayoutEffect(() => {
    callbacksRef.current = { onLanded, onDone };
    handlersRef.current = { skip, playExit, approach };
  });

  useGSAP(
    (context) => {
      const root = rootRef.current;
      if (root === null) {
        return;
      }
      const q = gsap.utils.selector(root);

      // The motion preference changed after the end: keep the final state.
      if (phaseRef.current !== 'playing') {
        settle(q, null);
        return;
      }

      if (reducedMotion) {
        // The final state, uncovered from gallery black by one short fade:
        // the screen before it is black, so nothing flashes.
        settle(q, null);
        root.dataset['motion'] = 'running';
        gsap.fromTo(
          q('[data-h="veil"]'),
          { autoAlpha: 1 },
          {
            autoAlpha: 0,
            duration: 0.3,
            ease: 'none',
            onComplete: () => {
              complete(root);
            },
          },
        );
        const fallback = window.setTimeout(() => {
          handlersRef.current.skip();
        }, 1500);
        return () => {
          window.clearTimeout(fallback);
        };
      }

      darken(q);
      const tl = gsap.timeline({ paused: true });
      timelineRef.current = tl;
      lightRoom(tl, q);
      root.dataset['motion'] = 'running';

      let cancelled = false;
      let deadline = 0;
      const cover = whenUncovered(root);
      void cover.promise.then(() => {
        if (cancelled || phaseRef.current !== 'playing') {
          return;
        }
        tl.play();
        deadline = window.setTimeout(() => {
          handlersRef.current.skip();
        }, SEQUENCE_DEADLINE_MS);
      });
      void Promise.all([
        cover.promise,
        waitForFonts(HANGING_FONTS),
        gate.promise,
      ]).then(() => {
        if (cancelled || phaseRef.current !== 'playing') {
          return;
        }
        context.add(() => {
          const impact = dropWork(tl, q, Math.max(DROP_AT, tl.time()));
          tl.call(
            () => {
              callbacksRef.current.onLanded();
            },
            [],
            impact + 0.3,
          );
          const copyAt = impact + COPY_AFTER_IMPACT;
          revealCopy(tl, q, copyAt, splitRef);
          tl.call(
            () => {
              splitRef.current?.revert();
              splitRef.current = null;
              complete(root);
            },
            [],
            copyAt + COPY_LENGTH,
          );
          // If the room already finished lighting, continue from its end.
          tl.play();
        });
      });
      return () => {
        cancelled = true;
        cover.cancel();
        window.clearTimeout(deadline);
        timelineRef.current = null;
        splitRef.current = null;
      };
    },
    {
      scope: rootRef,
      dependencies: [reducedMotion, gate],
      revertOnUpdate: true,
    },
  );

  return useMemo<HangingCeremony>(
    () => ({
      release: gate.open,
      skip: () => {
        handlersRef.current.skip();
      },
      leave: (tone) => {
        exitRef.current ??= new Promise<void>((resolve) => {
          handlersRef.current.playExit(tone, resolve);
        });
        return exitRef.current;
      },
      approach: (level) => {
        handlersRef.current.approach(level);
      },
    }),
    [gate],
  );
}
