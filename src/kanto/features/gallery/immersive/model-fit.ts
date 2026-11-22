/*
 * Normalises a downloaded model to the size and place the room expects:
 * scaled to a target height, centred on x and z, and standing on y = 0.
 * Pure arithmetic on a bounding box, so it is unit-tested without WebGL.
 */

export interface Bounds {
  readonly min: readonly [number, number, number];
  readonly max: readonly [number, number, number];
}

export interface ModelFit {
  readonly scale: number;
  /** Translation to apply after scaling. */
  readonly offset: readonly [number, number, number];
}

export function fitModel(bounds: Bounds, targetHeight: number): ModelFit {
  const width = bounds.max[0] - bounds.min[0];
  const height = bounds.max[1] - bounds.min[1];
  const depth = bounds.max[2] - bounds.min[2];
  if (!(height > 0) || !(width >= 0) || !(depth >= 0)) {
    return { scale: 1, offset: [0, 0, 0] };
  }
  const scale = targetHeight / height;
  const centreX = (bounds.min[0] + bounds.max[0]) / 2;
  const centreZ = (bounds.min[2] + bounds.max[2]) / 2;
  return {
    scale,
    offset: [-centreX * scale, -bounds.min[1] * scale, -centreZ * scale],
  };
}
