import { describe, expect, it } from 'vitest';
import { HUNG_ZOOM, visibleFrame, zoomScale } from './useHungFocus';

const DESKTOP = { width: 1440, height: 900 };
const PHONE = { width: 390, height: 844 };

describe('zoom of the hung work', () => {
  it('finds the gilded frame inside the square that carries it', () => {
    const frame = visibleFrame({ left: 238, top: 159, width: 538, height: 538 });
    expect(frame.width).toBeLessThan(538);
    expect(frame.height).toBeLessThan(538);
    // Same centre as the square.
    expect(frame.left + frame.width / 2).toBeCloseTo(238 + 269);
    expect(frame.top + frame.height / 2).toBeCloseTo(159 + 269);
  });

  it('grows the frame about 1.2 times when the viewport has room', () => {
    const frame = visibleFrame({ left: 238, top: 159, width: 538, height: 538 });
    expect(zoomScale(frame, DESKTOP)).toBe(HUNG_ZOOM);
    expect(HUNG_ZOOM).toBeCloseTo(1.2);
  });

  it('still has room on a phone, where the figure takes 84 % of the width', () => {
    const frame = visibleFrame({ left: 31, top: 72, width: 328, height: 328 });
    const scale = zoomScale(frame, PHONE);
    expect(scale).toBe(HUNG_ZOOM);
    const centreY = frame.top + frame.height / 2;
    expect(centreY - (frame.height * scale) / 2).toBeGreaterThanOrEqual(0);
    expect(frame.width * scale).toBeLessThanOrEqual(PHONE.width);
  });

  it('grows less when an edge of the viewport is closer than that', () => {
    // A frame that nearly fills the width of the phone.
    const wide = { left: 20, top: 100, width: 350, height: 300 };
    const sideways = zoomScale(wide, PHONE);
    expect(sideways).toBeGreaterThan(1);
    expect(sideways).toBeLessThan(HUNG_ZOOM);
    expect(wide.width * sideways).toBeLessThanOrEqual(PHONE.width);

    // A frame hung close to the top of the viewport.
    const high = { left: 100, top: 20, width: 190, height: 300 };
    const upwards = zoomScale(high, PHONE);
    expect(upwards).toBeGreaterThan(1);
    expect(upwards).toBeLessThan(HUNG_ZOOM);
    const centreY = high.top + high.height / 2;
    expect(centreY - (high.height * upwards) / 2).toBeGreaterThanOrEqual(0);
  });

  it('never shrinks a frame that already touches an edge', () => {
    const frame = { left: 0, top: 0, width: 390, height: 500 };
    expect(zoomScale(frame, PHONE)).toBe(1);
  });

  it('leaves a frame without a size alone', () => {
    expect(zoomScale({ left: 0, top: 0, width: 0, height: 0 }, DESKTOP)).toBe(1);
  });
});
