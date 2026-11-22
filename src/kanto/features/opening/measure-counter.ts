/*
 * Measures the counter of a glyph, the inside of the O, on an offscreen
 * canvas. The reveal cuts its hole from this measure, so the hole fits the O
 * of whichever font the visitor got: the licensed display font, the OFL
 * fallback or a system serif.
 */

/** Directions in which the ring is measured, evenly spaced over a full turn. */
export const COUNTER_ANGLES = 120;

/** Canvas pixels per em. At this size a hairline stays several pixels wide. */
const RASTER_EM = 512;
/** Margin around the glyph, in em, so no ray ends on the edge of the bitmap. */
const RASTER_MARGIN_EM = 0.2;
/** Opacity from which a pixel counts as ink. */
const INK = 127.5;
/** Step of the ray march, in bitmap pixels. */
const RAY_STEP = 0.5;

/** The ink ring around a counter, in the pixels of the bitmap it was read from. */
export interface RingTrace {
  /** Centre of the counter. */
  cx: number;
  cy: number;
  /** Distance from the centre to the inner edge of the ink, per direction. */
  inner: number[];
  /** Distance from the centre to the outer edge of the ink, per direction. */
  outer: number[];
}

/**
 * Finds the counter enclosed by the ink of an alpha bitmap and the ring
 * around it. Direction `k` points at the angle `k * 2π / angles`, measured
 * from the x axis towards the y axis (clockwise on a screen).
 *
 * Returns `null` when the ink does not enclose its centre, which is the case
 * of a glyph without a counter or of an empty bitmap.
 */
export function traceRing(
  alpha: ArrayLike<number>,
  width: number,
  height: number,
  angles: number = COUNTER_ANGLES,
): RingTrace | null {
  const isInk = (x: number, y: number): boolean =>
    (alpha[y * width + x] ?? 0) > INK;

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (isInk(x, y)) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) {
    return null;
  }

  // Flood the paper from the middle of the ink. Reaching the bounding box
  // means the ink does not close around it.
  const seedX = Math.round((minX + maxX) / 2);
  const seedY = Math.round((minY + maxY) / 2);
  if (isInk(seedX, seedY)) {
    return null;
  }
  const visited = new Uint8Array(width * height);
  const stack = [seedY * width + seedX];
  visited[seedY * width + seedX] = 1;
  let count = 0;
  let sumX = 0;
  let sumY = 0;
  while (stack.length > 0) {
    const index = stack.pop() ?? 0;
    const x = index % width;
    const y = (index - x) / width;
    if (x <= minX || x >= maxX || y <= minY || y >= maxY) {
      return null;
    }
    count += 1;
    sumX += x;
    sumY += y;
    const neighbours = [index - 1, index + 1, index - width, index + width];
    for (const next of neighbours) {
      if (visited[next] === 0 && (alpha[next] ?? 0) <= INK) {
        visited[next] = 1;
        stack.push(next);
      }
    }
  }
  const cx = sumX / count + 0.5;
  const cy = sumY / count + 0.5;

  // Opacity between pixel centres, so an edge is placed to a fraction of a pixel.
  const sample = (x: number, y: number): number => {
    const fx = x - 0.5;
    const fy = y - 0.5;
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    if (x0 < 0 || y0 < 0 || x0 + 1 >= width || y0 + 1 >= height) {
      return Number.NaN;
    }
    const tx = fx - x0;
    const ty = fy - y0;
    const row = y0 * width + x0;
    const top = (alpha[row] ?? 0) * (1 - tx) + (alpha[row + 1] ?? 0) * tx;
    const bottom =
      (alpha[row + width] ?? 0) * (1 - tx) +
      (alpha[row + width + 1] ?? 0) * tx;
    return top * (1 - ty) + bottom * ty;
  };

  const inner: number[] = [];
  const outer: number[] = [];
  for (let k = 0; k < angles; k += 1) {
    const angle = (k * 2 * Math.PI) / angles;
    const ux = Math.cos(angle);
    const uy = Math.sin(angle);
    let previous = sample(cx, cy);
    let entered: number | null = null;
    let left: number | null = null;
    for (let r = RAY_STEP; left === null; r += RAY_STEP) {
      const value = sample(cx + ux * r, cy + uy * r);
      if (Number.isNaN(value)) {
        return null;
      }
      if (entered === null && previous <= INK && value > INK) {
        entered = r - RAY_STEP + (RAY_STEP * (INK - previous)) / (value - previous);
      } else if (entered !== null && previous > INK && value <= INK) {
        left = r - RAY_STEP + (RAY_STEP * (previous - INK)) / (previous - value);
      }
      previous = value;
    }
    if (entered === null || entered <= 0 || left <= entered) {
      return null;
    }
    inner.push(entered);
    outer.push(left);
  }
  return { cx, cy, inner, outer };
}

/** The counter of a glyph as it is laid out in the page, in CSS pixels. */
export interface GlyphCounter {
  /** Centre of the counter, from the pen origin of the glyph (x to the right, y down from the baseline). */
  dx: number;
  dy: number;
  /** Distance from the centre to the inner edge of the ink, per direction. */
  inner: number[];
  /** Distance from the centre to the outer edge of the ink, per direction. */
  outer: number[];
}

export interface GlyphStyle {
  /** CSS `font-family` list, as computed on the element that shows the glyph. */
  family: string;
  /** Font size in CSS pixels. */
  size: number;
  weight: string;
  style: string;
}

/**
 * Draws one glyph with the given font and measures its counter. The canvas
 * resolves the family list like the page does, so call it once the fonts of
 * the page have settled. Returns `null` without a 2D canvas, or when the
 * glyph has no closed counter.
 */
export function measureGlyphCounter(
  glyph: string,
  font: GlyphStyle,
): GlyphCounter | null {
  if (!(font.size > 0)) {
    return null;
  }
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (context === null) {
      return null;
    }
    const shorthand = `${font.style} ${font.weight} ${String(font.size)}px ${font.family}`;
    context.font = shorthand;
    const metrics = context.measureText(glyph);
    const margin = RASTER_MARGIN_EM * font.size;
    const left = Math.max(0, metrics.actualBoundingBoxLeft) + margin;
    const right = Math.max(metrics.width, metrics.actualBoundingBoxRight) + margin;
    const ascent = Math.max(0, metrics.actualBoundingBoxAscent) + margin;
    const descent = Math.max(0, metrics.actualBoundingBoxDescent) + margin;
    if (![left, right, ascent, descent].every(Number.isFinite)) {
      return null;
    }

    const resolution = RASTER_EM / font.size;
    canvas.width = Math.ceil((left + right) * resolution);
    canvas.height = Math.ceil((ascent + descent) * resolution);
    // Resizing a canvas resets its state: the font is set again.
    context.setTransform(resolution, 0, 0, resolution, 0, 0);
    context.font = shorthand;
    context.textBaseline = 'alphabetic';
    context.textAlign = 'left';
    context.fillStyle = '#000';
    context.fillText(glyph, left, ascent);

    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    const alpha = new Uint8ClampedArray(canvas.width * canvas.height);
    for (let index = 0; index < alpha.length; index += 1) {
      alpha[index] = data[index * 4 + 3] ?? 0;
    }
    const trace = traceRing(alpha, canvas.width, canvas.height);
    if (trace === null) {
      return null;
    }
    return {
      dx: trace.cx / resolution - left,
      dy: trace.cy / resolution - ascent,
      inner: trace.inner.map((radius) => radius / resolution),
      outer: trace.outer.map((radius) => radius / resolution),
    };
  } catch {
    // A canvas that cannot be read (privacy settings) leaves the simple reveal.
    return null;
  }
}
