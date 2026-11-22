import { describe, expect, it } from 'vitest';
import { fitModel } from './model-fit';

describe('fitModel', () => {
  it('scales a model to the target height and stands it on the ground', () => {
    const fit = fitModel({ min: [-1, 2, -0.5], max: [1, 6, 0.5] }, 0.4);
    expect(fit.scale).toBeCloseTo(0.1);
    expect(fit.offset[0]).toBeCloseTo(0);
    expect(fit.offset[1]).toBeCloseTo(-0.2);
    expect(fit.offset[2]).toBeCloseTo(0);
  });

  it('re-centres a model that is off axis', () => {
    const fit = fitModel({ min: [10, 0, 4], max: [12, 1, 6] }, 1);
    expect(fit.scale).toBe(1);
    expect(fit.offset).toEqual([-11, -0, -5]);
  });

  it('leaves a degenerate model untouched', () => {
    expect(fitModel({ min: [0, 0, 0], max: [0, 0, 0] }, 1)).toEqual({
      scale: 1,
      offset: [0, 0, 0],
    });
  });
});
