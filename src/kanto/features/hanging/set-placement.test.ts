import { describe, expect, it } from 'vitest';
import { placePhoto } from './set-placement';

/** Where a point of the photograph (in Figma stage pixels from its corner) lands on screen. */
function onScreen(
  placement: ReturnType<typeof placePhoto>,
  x: number,
  y: number,
): { x: number; y: number } {
  return {
    x: placement.left + (x / 1830) * placement.width,
    y: placement.top + (y / 1011) * placement.height,
  };
}

describe('placePhoto', () => {
  it('keeps the Figma placement on the 1440x900 stage', () => {
    const placement = placePhoto({
      width: 1440,
      height: 900,
      floorX: 507,
      floorY: 872,
      unit: 1,
    });
    expect(placement).toEqual({ left: -329, top: -56, width: 1830, height: 1011 });
  });

  it('keeps the floor point under the work on a wide screen and still covers it', () => {
    // 2560x900: the stage is centred, the photograph must reach both sides.
    const floorX = (2560 - 1440) / 2 + 507;
    const placement = placePhoto({
      width: 2560,
      height: 900,
      floorX,
      floorY: 872,
      unit: 1,
    });
    const floor = onScreen(placement, 507 + 329, 872 + 56);
    expect(floor.x).toBeCloseTo(floorX, 5);
    expect(floor.y).toBeCloseTo(872, 5);
    expect(placement.left).toBeLessThanOrEqual(0);
    expect(placement.left + placement.width).toBeGreaterThanOrEqual(2560);
    expect(placement.top).toBeLessThanOrEqual(0);
  });

  it('does not magnify the wall to fill a tall screen under the floor', () => {
    const placement = placePhoto({
      width: 1440,
      height: 1400,
      floorX: 507,
      floorY: 250 + 872,
      unit: 1,
    });
    // Only the top needs covering: a little more than the stage scale.
    expect(placement.width / 1830).toBeLessThan(1.3);
    expect(placement.top).toBeLessThanOrEqual(0);
  });

  it('scales with the set unit of the phone layout', () => {
    const unit = 0.4647;
    const placement = placePhoto({
      width: 390,
      height: 402,
      floorX: 195,
      floorY: 375,
      unit,
    });
    const floor = onScreen(placement, 507 + 329, 872 + 56);
    expect(floor.x).toBeCloseTo(195, 5);
    expect(floor.y).toBeCloseTo(375, 5);
    expect(placement.left).toBeLessThanOrEqual(0);
    expect(placement.left + placement.width).toBeGreaterThanOrEqual(390);
    expect(placement.top).toBeLessThanOrEqual(0);
    expect(placement.top + placement.height).toBeGreaterThanOrEqual(402);
  });
});
