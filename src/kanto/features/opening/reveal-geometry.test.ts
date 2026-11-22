import { describe, expect, it } from 'vitest';
import {
  CLOSED_COVER_PATH,
  coverPath,
  midRing,
  revealScale,
  ringBand,
  ringPath,
  roundHole,
  scaleToClear,
} from './reveal-geometry';

const viewport = { width: 1440, height: 900 };

/** Radii of an ellipse with half-axes a and b, per direction. */
function ellipse(a: number, b: number, count = 120): number[] {
  return Array.from({ length: count }, (_, index) => {
    const angle = (index * 2 * Math.PI) / count;
    return (a * b) / Math.hypot(b * Math.cos(angle), a * Math.sin(angle));
  });
}

/** Coordinates of the sub-paths of an SVG path made of M, L, H, V and Z. */
function subPaths(d: string): string[] {
  return d
    .split('M')
    .filter((part) => part !== '')
    .map((part) => `M${part}`);
}

describe('hole of the cover', () => {
  it('runs in the middle of the ink, under it all the way round', () => {
    const inner = ellipse(12, 20);
    const outer = ellipse(15, 21);
    const middle = midRing(inner, outer);
    expect(middle).toHaveLength(inner.length);
    middle.forEach((radius, index) => {
      expect(radius).toBeGreaterThan(inner[index] ?? 0);
      expect(radius).toBeLessThan(outer[index] ?? 0);
    });
  });

  it('draws its band of ink inside the ink of the glyph and over the edge of the hole', () => {
    const inner = ellipse(12, 20);
    const outer = ellipse(15, 21);
    const middle = midRing(inner, outer);
    const band = ringBand(inner, outer, 0.7);
    band.inner.forEach((radius, index) => {
      expect(radius).toBeGreaterThan(inner[index] ?? 0);
      expect(radius).toBeLessThan(middle[index] ?? 0);
    });
    band.outer.forEach((radius, index) => {
      expect(radius).toBeLessThan(outer[index] ?? 0);
      expect(radius).toBeGreaterThan(middle[index] ?? 0);
    });
  });

  it('cuts a real hole: the viewport, then the outline of the hole as a second sub-path', () => {
    const hole = { centre: { x: 800, y: 440 }, radii: ellipse(13, 20, 8) };
    const d = coverPath(viewport, hole, 1);
    const parts = subPaths(d);
    expect(parts).toHaveLength(2);
    expect(parts[0]).toBe('M0 0H1440V900H0Z');
    // The first point of the hole lies on the x axis, one radius from the centre.
    expect(parts[1]?.startsWith('M813 440L')).toBe(true);
    expect(parts[1]?.endsWith('Z')).toBe(true);
  });

  it('grows the hole from its centre by the scale of the word', () => {
    const hole = { centre: { x: 800, y: 440 }, radii: [10, 10, 10, 10] };
    expect(coverPath(viewport, hole, 1)).toContain('M810 440L800 450L790 440L800 430Z');
    expect(coverPath(viewport, hole, 3)).toContain('M830 440L800 470L770 440L800 410Z');
  });

  it('draws the ring between two outlines of the same centre', () => {
    const centre = { x: 100, y: 100 };
    const parts = subPaths(ringPath(centre, [10, 10, 10, 10], [20, 20, 20, 20], 2));
    expect(parts).toEqual([
      'M140 100L100 140L60 100L100 60Z',
      'M120 100L100 120L80 100L100 80Z',
    ]);
  });

  it('starts closed: before the reveal the cover has no hole', () => {
    expect(subPaths(CLOSED_COVER_PATH)).toHaveLength(1);
  });
});

describe('scale of the reveal', () => {
  it('ends when the inner edge of the O holds the whole viewport', () => {
    const centre = { x: 800, y: 450 };
    const inner = ellipse(12, 20);
    const scale = scaleToClear(viewport, centre, inner);
    // The farthest corner from an O on the right of the centre is on the left.
    const corners = [
      { x: 0, y: 0 },
      { x: 1440, y: 0 },
      { x: 1440, y: 900 },
      { x: 0, y: 900 },
    ];
    for (const corner of corners) {
      const dx = corner.x - centre.x;
      const dy = corner.y - centre.y;
      // Inside the scaled ellipse: (x/a)² + (y/b)² <= 1, with a small tolerance for the sampling.
      const inside = (dx / (12 * scale)) ** 2 + (dy / (20 * scale)) ** 2;
      expect(inside).toBeLessThanOrEqual(1.001);
    }
    const farthest = (800 / (12 * scale)) ** 2 + (450 / (20 * scale)) ** 2;
    expect(farthest).toBeGreaterThan(0.98);
  });

  it('needs a larger scale for a narrower counter', () => {
    const centre = { x: 800, y: 450 };
    expect(scaleToClear(viewport, centre, ellipse(8, 20))).toBeGreaterThan(
      scaleToClear(viewport, centre, ellipse(20, 20)),
    );
  });

  it('grows from 1 to the end scale without ever shrinking', () => {
    const end = 36;
    expect(revealScale(0, end)).toBe(1);
    expect(revealScale(1, end)).toBeCloseTo(end, 6);
    let previous = 1;
    for (let step = 1; step <= 100; step += 1) {
      const scale = revealScale(step / 100, end);
      expect(scale).toBeGreaterThan(previous);
      previous = scale;
    }
  });

  it('stays within its range outside the time of the reveal', () => {
    expect(revealScale(-0.5, 40)).toBe(1);
    expect(revealScale(2, 40)).toBeCloseTo(40, 6);
  });

  it('offers a round hole for the simple reveal', () => {
    const hole = roundHole({ x: 10, y: 20 }, 12);
    expect(hole.radii).toHaveLength(12);
    expect(new Set(hole.radii)).toEqual(new Set([1]));
    // Scaled by a radius in pixels, it is a circle of that radius.
    expect(scaleToClear({ width: 100, height: 100 }, { x: 50, y: 50 }, hole.radii)).toBeCloseTo(
      Math.hypot(50, 50),
      6,
    );
  });
});
