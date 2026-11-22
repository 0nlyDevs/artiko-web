import { describe, expect, it } from 'vitest';
import { nearness } from './spot-level';

describe('nearness', () => {
  it('is full on the work and null beyond the reach of the lamp', () => {
    expect(nearness(0, 400)).toBe(1);
    expect(nearness(400, 400)).toBe(0);
    expect(nearness(900, 400)).toBe(0);
  });

  it('rises smoothly as the visitor comes closer', () => {
    const far = nearness(300, 400);
    const mid = nearness(200, 400);
    const close = nearness(100, 400);
    expect(far).toBeGreaterThan(0);
    expect(mid).toBeCloseTo(0.5, 5);
    expect(close).toBeGreaterThan(mid);
    expect(close).toBeLessThan(1);
    expect(mid).toBeGreaterThan(far);
  });

  it('ignores the side the visitor comes from and a lamp without reach', () => {
    expect(nearness(-200, 400)).toBe(nearness(200, 400));
    expect(nearness(10, 0)).toBe(0);
  });
});
