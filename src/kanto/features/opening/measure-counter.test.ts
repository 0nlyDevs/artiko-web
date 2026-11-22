import { describe, expect, it } from 'vitest';
import { measureGlyphCounter, traceRing } from './measure-counter';

interface Ring {
  cx: number;
  cy: number;
  /** Half-axes of the counter. */
  innerA: number;
  innerB: number;
  /** Half-axes of the outer edge of the ink. */
  outerA: number;
  outerB: number;
}

/** An alpha bitmap of an elliptical ink ring, with soft edges like rendered text. */
function ringBitmap(width: number, height: number, ring: Ring, gap = false): Uint8ClampedArray {
  const alpha = new Uint8ClampedArray(width * height);
  const coverage = (x: number, y: number): number => {
    const dx = x - ring.cx;
    const dy = y - ring.cy;
    if (gap && dx > 0 && Math.abs(dy) < 6) {
      return 0;
    }
    const angle = Math.atan2(dy, dx);
    const radius = Math.hypot(dx, dy);
    const along = (a: number, b: number): number =>
      (a * b) / Math.hypot(b * Math.cos(angle), a * Math.sin(angle));
    const inner = along(ring.innerA, ring.innerB);
    const outer = along(ring.outerA, ring.outerB);
    // One pixel of anti-aliasing on each edge.
    return Math.min(
      Math.max(0, Math.min(1, radius - inner + 0.5)),
      Math.max(0, Math.min(1, outer - radius + 0.5)),
    );
  };
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      alpha[y * width + x] = Math.round(coverage(x + 0.5, y + 0.5) * 255);
    }
  }
  return alpha;
}

describe('tracing the ring of a glyph', () => {
  const ring: Ring = { cx: 150.3, cy: 201.6, innerA: 60, innerB: 110, outerA: 90, outerB: 118 };
  const alpha = ringBitmap(300, 400, ring);

  it('finds the centre of the counter', () => {
    const trace = traceRing(alpha, 300, 400);
    expect(trace).not.toBeNull();
    expect(trace?.cx).toBeCloseTo(ring.cx, 0);
    expect(trace?.cy).toBeCloseTo(ring.cy, 0);
  });

  it('measures both edges of the ink in every direction, to a fraction of a pixel', () => {
    const trace = traceRing(alpha, 300, 400, 72);
    expect(trace?.inner).toHaveLength(72);
    expect(trace?.outer).toHaveLength(72);
    if (trace === null) {
      return;
    }
    trace.inner.forEach((radius, index) => {
      const angle = (index * 2 * Math.PI) / 72;
      // The same point seen from the true centre of the ring.
      const x = trace.cx + Math.cos(angle) * radius - ring.cx;
      const y = trace.cy + Math.sin(angle) * radius - ring.cy;
      expect((x / ring.innerA) ** 2 + (y / ring.innerB) ** 2).toBeCloseTo(1, 1);
    });
    trace.outer.forEach((radius, index) => {
      const angle = (index * 2 * Math.PI) / 72;
      const x = trace.cx + Math.cos(angle) * radius - ring.cx;
      const y = trace.cy + Math.sin(angle) * radius - ring.cy;
      expect((x / ring.outerA) ** 2 + (y / ring.outerB) ** 2).toBeCloseTo(1, 1);
      expect(radius).toBeGreaterThan(trace.inner[index] ?? Infinity);
    });
  });

  it('follows a hairline: a ring two pixels thin is still closed', () => {
    const thin = ringBitmap(300, 400, { ...ring, outerA: 62, outerB: 112 });
    const trace = traceRing(thin, 300, 400);
    expect(trace).not.toBeNull();
    for (const [index, radius] of (trace?.outer ?? []).entries()) {
      expect(radius - (trace?.inner[index] ?? 0)).toBeGreaterThan(1);
      expect(radius - (trace?.inner[index] ?? 0)).toBeLessThan(3);
    }
  });

  it('gives up on ink that does not close around its centre', () => {
    expect(traceRing(ringBitmap(300, 400, ring, true), 300, 400)).toBeNull();
  });

  it('gives up on an empty bitmap and on a filled shape', () => {
    expect(traceRing(new Uint8ClampedArray(100 * 100), 100, 100)).toBeNull();
    expect(traceRing(new Uint8ClampedArray(100 * 100).fill(255), 100, 100)).toBeNull();
  });
});

describe('measuring a glyph on a canvas', () => {
  it('reports no measure where no 2D canvas exists, so the simple reveal takes over', () => {
    // jsdom has no canvas: this is the fallback path of a browser that refuses one.
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = (() => null) as typeof original;
    try {
      expect(
        measureGlyphCounter('O', { family: 'serif', size: 72, weight: '400', style: 'normal' }),
      ).toBeNull();
    } finally {
      HTMLCanvasElement.prototype.getContext = original;
    }
  });

  it('refuses a font size that cannot be drawn', () => {
    expect(
      measureGlyphCounter('O', { family: 'serif', size: 0, weight: '400', style: 'normal' }),
    ).toBeNull();
    expect(
      measureGlyphCounter('O', { family: 'serif', size: Number.NaN, weight: '400', style: 'normal' }),
    ).toBeNull();
  });
});
