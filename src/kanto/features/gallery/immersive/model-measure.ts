import { Box3, Matrix4, Mesh, Vector3 } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import type { Bounds } from './model-fit';

/*
 * Measures a downloaded model in its own frame, whatever transform its root
 * carries: a cached model keeps the scale of its last fit, and measuring it
 * in world space would fit it twice.
 */

export interface ModelMeasure {
  readonly bounds: Bounds;
  /**
   * Largest distance from the vertical axis through the centre of the
   * bounds to the surface: the half width of the object from any side.
   */
  readonly radius: number;
}

/** Vertices read per mesh at most: enough to find the outline of a scan. */
const SAMPLE_LIMIT = 20000;

const EMPTY: ModelMeasure = {
  bounds: { min: [0, 0, 0], max: [0, 0, 0] },
  radius: 0,
};

export function measureModel(root: Object3D): ModelMeasure {
  root.updateWorldMatrix(true, true);
  const toRoot = new Matrix4().copy(root.matrixWorld).invert();
  const meshes: { geometry: BufferGeometry; matrix: Matrix4 }[] = [];
  const box = new Box3();
  const meshBox = new Box3();

  root.traverse((object) => {
    if (!(object instanceof Mesh)) {
      return;
    }
    const geometry = object.geometry as BufferGeometry;
    if (!geometry.hasAttribute('position')) {
      return;
    }
    if (geometry.boundingBox === null) {
      geometry.computeBoundingBox();
    }
    if (geometry.boundingBox === null) {
      return;
    }
    const matrix = new Matrix4().multiplyMatrices(toRoot, object.matrixWorld);
    box.union(meshBox.copy(geometry.boundingBox).applyMatrix4(matrix));
    meshes.push({ geometry, matrix });
  });

  if (box.isEmpty()) {
    return EMPTY;
  }

  const centreX = (box.min.x + box.max.x) / 2;
  const centreZ = (box.min.z + box.max.z) / 2;
  const point = new Vector3();
  let radiusSquared = 0;
  for (const { geometry, matrix } of meshes) {
    const positions = geometry.getAttribute('position');
    const step = Math.max(1, Math.ceil(positions.count / SAMPLE_LIMIT));
    for (let index = 0; index < positions.count; index += step) {
      point.fromBufferAttribute(positions, index).applyMatrix4(matrix);
      radiusSquared = Math.max(
        radiusSquared,
        (point.x - centreX) ** 2 + (point.z - centreZ) ** 2,
      );
    }
  }

  return {
    bounds: {
      min: [box.min.x, box.min.y, box.min.z],
      max: [box.max.x, box.max.y, box.max.z],
    },
    radius: Math.sqrt(radiusSquared),
  };
}
