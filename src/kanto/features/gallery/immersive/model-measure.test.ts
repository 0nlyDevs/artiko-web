import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
} from 'three';
import { describe, expect, it } from 'vitest';
import { fitModel } from './model-fit';
import { measureModel } from './model-measure';

const material = new MeshBasicMaterial();

describe('measureModel', () => {
  it('measures the bounds of a model and its half width from any side', () => {
    const root = new Group();
    root.add(new Mesh(new BoxGeometry(2, 1, 1), material));
    const measure = measureModel(root);

    expect(measure.bounds.min).toEqual([-1, -0.5, -0.5]);
    expect(measure.bounds.max).toEqual([1, 0.5, 0.5]);
    // A box turned on its pedestal sweeps its diagonal, not its width.
    expect(measure.radius).toBeCloseTo(Math.hypot(1, 0.5));
  });

  it('gives a round object its radius', () => {
    const root = new Group();
    root.add(new Mesh(new CylinderGeometry(0.3, 0.3, 0.5, 48), material));
    expect(measureModel(root).radius).toBeCloseTo(0.3, 2);
  });

  it('follows the transforms inside the model', () => {
    const root = new Group();
    const part = new Mesh(new BoxGeometry(1, 1, 1), material);
    part.position.set(2, 0, 0);
    part.scale.set(2, 1, 1);
    root.add(part);
    const measure = measureModel(root);

    expect(measure.bounds.min[0]).toBeCloseTo(1);
    expect(measure.bounds.max[0]).toBeCloseTo(3);
    // Around the vertical axis through the centre of the bounds.
    expect(measure.radius).toBeCloseTo(Math.hypot(1, 0.5));
  });

  it('ignores the transform of the root, so a model is never fitted twice', () => {
    const root = new Group();
    root.add(new Mesh(new BoxGeometry(0.4, 0.2, 0.4), material));
    const first = measureModel(root);
    const fit = fitModel(first.bounds, 1);
    expect(fit.scale).toBeCloseTo(5);

    // The room applies the fit to the cached root, then mounts it again.
    root.scale.setScalar(fit.scale);
    root.position.set(fit.offset[0], fit.offset[1], fit.offset[2]);
    const again = measureModel(root);
    expect(again.bounds).toEqual(first.bounds);
    expect(again.radius).toBeCloseTo(first.radius);
    expect(fitModel(again.bounds, 1).scale).toBeCloseTo(5);
  });

  it('measures nothing in a model without geometry', () => {
    const root = new Group();
    root.add(new Group());
    root.add(new Mesh(new BufferGeometry(), material));
    expect(measureModel(root)).toEqual({
      bounds: { min: [0, 0, 0], max: [0, 0, 0] },
      radius: 0,
    });
  });
});
