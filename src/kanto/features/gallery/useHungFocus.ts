import type { RefObject } from 'react';
import { useEffect, useRef } from 'react';
import { gsap } from '../../lib/motion/gsap';

/*
 * The focus of the photographic room: the hung work grows around its
 * centre, about 1.2 times, and never past the edges of the viewport.
 * The veil, the wall text and the return button are faded by useFocusChrome.
 */

/** Scale of the framed work in focus when the viewport leaves room for it. */
export const HUNG_ZOOM = 1.2;
/** Free space kept between the scaled frame and the edges of the viewport. */
const VIEWPORT_MARGIN = 8;
/** The gilded frame fills this share of its square image, the rest is shadow. */
const FRAME_SHARE = { width: 0.7, height: 0.84 } as const;
/** Wall-clock limit of the zoom, see FADE_DEADLINE_MS in useFocusChrome. */
const ZOOM_DEADLINE_MS = 1400;

export interface Box {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export interface Viewport {
  readonly width: number;
  readonly height: number;
}

/** The visible frame inside the square that carries it. */
export function visibleFrame(figure: Box): Box {
  const width = figure.width * FRAME_SHARE.width;
  const height = figure.height * FRAME_SHARE.height;
  return {
    left: figure.left + (figure.width - width) / 2,
    top: figure.top + (figure.height - height) / 2,
    width,
    height,
  };
}

/**
 * How much a frame may grow around its centre: HUNG_ZOOM, or less when an
 * edge of the viewport is closer than that. Never below 1.
 */
export function zoomScale(frame: Box, viewport: Viewport): number {
  if (!(frame.width > 0) || !(frame.height > 0)) {
    return 1;
  }
  const centreX = frame.left + frame.width / 2;
  const centreY = frame.top + frame.height / 2;
  const reachX =
    Math.min(centreX, viewport.width - centreX) - VIEWPORT_MARGIN;
  const reachY =
    Math.min(centreY, viewport.height - centreY) - VIEWPORT_MARGIN;
  const fit = Math.min(
    (2 * reachX) / frame.width,
    (2 * reachY) / frame.height,
  );
  return Math.min(HUNG_ZOOM, Math.max(1, fit));
}

interface HungFocusOptions {
  focused: boolean;
  reducedMotion: boolean;
}

/**
 * Scales `[data-anim="focus-zoom"]`, the content of the hung figure, when
 * the work is in focus, and back when it is not. Reduced motion swaps the
 * size behind a short fade instead of growing the frame.
 */
export function useHungFocus(
  rootRef: RefObject<HTMLElement | null>,
  { focused, reducedMotion }: HungFocusOptions,
): void {
  // Nothing to undo until the work has been in focus once.
  const touchedRef = useRef(false);

  useEffect(() => {
    const root = rootRef.current;
    if (root === null || (!touchedRef.current && !focused)) {
      return undefined;
    }
    touchedRef.current = true;

    const q = gsap.utils.selector(root);
    const target = q('[data-anim="focus-zoom"]');
    const measure = (): number => {
      const figure = q('[data-g="hung"]')[0];
      if (!focused || figure === undefined) {
        return 1;
      }
      return zoomScale(visibleFrame(figure.getBoundingClientRect()), {
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    const tl = gsap.timeline();
    if (reducedMotion) {
      tl.to(target, { autoAlpha: 0, duration: 0.15, ease: 'none' })
        .set(target, { scale: measure() })
        .to(target, { autoAlpha: 1, duration: 0.2, ease: 'none' });
    } else {
      // The fade of a reduced-motion zoom may have been cut short: undo it.
      tl.to(target, {
        scale: measure(),
        autoAlpha: 1,
        duration: focused ? 0.7 : 0.5,
        ease: 'power3.out',
      });
    }

    // A turned phone or a resized window keeps the frame inside the viewport.
    const refit = (): void => {
      if (focused) {
        tl.progress(1);
        gsap.set(target, { scale: measure() });
      }
    };
    window.addEventListener('resize', refit);
    const deadline = window.setTimeout(() => {
      tl.progress(1);
    }, ZOOM_DEADLINE_MS);
    return () => {
      window.removeEventListener('resize', refit);
      window.clearTimeout(deadline);
      tl.kill();
    };
  }, [rootRef, focused, reducedMotion]);
}
