import { gsap } from '../../lib/motion/gsap';
import { measureGlyphCounter } from './measure-counter';
import type { Hole, Size } from './reveal-geometry';
import {
  coverPath,
  midRing,
  revealScale,
  ringBand,
  ringPath,
  roundHole,
  scaleToClear,
} from './reveal-geometry';

/** Length of the zoom through the O, in seconds. */
export const REVEAL_SECONDS = 0.9;
/** Length of the fade that replaces the zoom under reduced motion, in seconds. */
export const FADE_SECONDS = 0.4;
/** The hairline leaves in this time when the cover starts to open. */
const BAR_FADE_SECONDS = 0.2;
/** Margin over the scale at which the ink has just left the screen. */
const CLEAR_MARGIN = 1.02;
/**
 * Share of the O's ink, around its middle, that the reveal draws itself over
 * the edge of the hole. A browser places small text on whole pixels, up to
 * half a pixel away from its outline: this band keeps ink over the seam
 * between page and cover wherever the glyph lands, and stays inside the glyph.
 */
const SEAM_INK_SHARE = 0.7;

export interface RevealElements {
  /** The whole opening. */
  root: HTMLElement;
  /** Path of the ivory cover. */
  cover: SVGPathElement;
  /** Path of the ink drawn over the edge of the hole. */
  seam: SVGPathElement;
  /** The wordmark, which grows from the centre of its O. */
  word: HTMLElement;
  /** The letter O. */
  glyph: HTMLElement;
  /** Zero-size mark sitting on the baseline of the O. */
  baseline: HTMLElement;
  /** The loading hairline. */
  bar: HTMLElement;
}

export interface RevealOptions {
  reducedMotion: boolean;
  onComplete: () => void;
}

interface GlyphHole {
  /** Outline under the ink of the O, where the cover is cut. */
  hole: Hole;
  /** Inner edge of the O: once it holds the viewport, no ink is left on screen. */
  inner: readonly number[];
  /** The band of ink drawn over the edge of the hole, inside the ink of the O. */
  band: { inner: number[]; outer: number[] };
}

function fontsPending(): boolean {
  return 'fonts' in document && document.fonts.status === 'loading';
}

/** Where the counter of the O sits on screen, or `null` when it cannot be measured. */
function locateGlyphHole({ glyph, baseline }: RevealElements): GlyphHole | null {
  // A face still loading could change the glyph under the hole.
  if (fontsPending()) {
    return null;
  }
  const style = window.getComputedStyle(glyph);
  const counter = measureGlyphCounter((glyph.textContent ?? '').trim(), {
    family: style.fontFamily,
    size: Number.parseFloat(style.fontSize),
    weight: style.fontWeight,
    style: style.fontStyle,
  });
  if (counter === null) {
    return null;
  }
  const penX = glyph.getBoundingClientRect().left;
  const baselineY = baseline.getBoundingClientRect().top;
  return {
    hole: {
      centre: { x: penX + counter.dx, y: baselineY + counter.dy },
      radii: midRing(counter.inner, counter.outer),
    },
    inner: counter.inner,
    band: ringBand(counter.inner, counter.outer, SEAM_INK_SHARE),
  };
}

/**
 * Opens the cover. The whole word grows from the centre of its O while a
 * hole with the shape of the O's counter grows with it, by the same factor
 * and from the same point: the ink ring stays on the edge of the hole and
 * the page shows through. The edge of the hole runs in the middle of the
 * ink, under a band of ink drawn with it.
 *
 * When the O cannot be measured, a round hole grows from the letter and the
 * word fades. Under reduced motion nothing moves: the cover fades out.
 *
 * Returns the function that stops the animation.
 */
export function playReveal(
  elements: RevealElements,
  { reducedMotion, onComplete }: RevealOptions,
): () => void {
  const { root, cover, seam, word, glyph, bar } = elements;

  if (reducedMotion) {
    const fade = gsap.to(root, {
      autoAlpha: 0,
      duration: FADE_SECONDS,
      ease: 'none',
      onComplete,
    });
    return () => {
      fade.kill();
    };
  }

  const viewport: Size = {
    width: window.innerWidth,
    height: window.innerHeight,
  };
  const state = { t: 0 };
  const barFade = gsap.to(bar, {
    autoAlpha: 0,
    duration: BAR_FADE_SECONDS,
    ease: 'none',
  });

  const located = locateGlyphHole(elements);
  let draw: () => void;
  if (located === null) {
    const box = glyph.getBoundingClientRect();
    const hole = roundHole({
      x: box.left + box.width / 2,
      y: box.top + box.height / 2,
    });
    const endRadius =
      scaleToClear(viewport, hole.centre, hole.radii) * CLEAR_MARGIN;
    draw = () => {
      cover.setAttribute(
        'd',
        coverPath(viewport, hole, state.t * state.t * endRadius),
      );
      word.style.opacity = String(Math.max(0, 1 - state.t * 3));
    };
  } else {
    const { hole, inner, band } = located;
    const endScale =
      scaleToClear(viewport, hole.centre, inner) * CLEAR_MARGIN;
    const box = word.getBoundingClientRect();
    word.style.transformOrigin = `${String(hole.centre.x - box.left)}px ${String(hole.centre.y - box.top)}px`;
    draw = () => {
      const scale = revealScale(state.t, endScale);
      word.style.transform = `scale(${String(scale)})`;
      cover.setAttribute('d', coverPath(viewport, hole, scale));
      seam.setAttribute(
        'd',
        ringPath(hole.centre, band.inner, band.outer, scale),
      );
    };
  }

  draw();
  const zoom = gsap.to(state, {
    t: 1,
    duration: REVEAL_SECONDS,
    ease: 'none',
    onUpdate: draw,
    onComplete,
  });
  return () => {
    zoom.kill();
    barFade.kill();
  };
}
