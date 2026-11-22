import type { ModelViewerHandle } from '../artwork-viewer/model-viewer-element';

/*
 * Stands a scanned work on the plinth. The camera of model-viewer looks at
 * the centre of the base of the object, which therefore stays at the centre
 * of the element whatever the angle: the stylesheet puts that centre on the
 * top of the plinth. The distance then shows the object at the size the
 * plinth can carry.
 */

interface Vector3D {
  x: number;
  y: number;
  z: number;
}

/** What the plinth needs from model-viewer beyond the typing of the viewer feature. */
export interface StageViewer extends ModelViewerHandle {
  cameraTarget: string;
  minCameraOrbit: string;
  maxCameraOrbit: string;
  getDimensions: () => Vector3D;
  getBoundingBoxCenter: () => Vector3D;
  getFieldOfView: () => number;
  updateFraming: () => Promise<void>;
  jumpCameraToGoal: () => void;
}

const STAGE_METHODS = [
  'getDimensions',
  'getBoundingBoxCenter',
  'getFieldOfView',
  'updateFraming',
  'jumpCameraToGoal',
] as const;

/** True once the element is the upgraded model-viewer with the calls used below. */
export function isStageViewer(
  element: ModelViewerHandle,
): element is StageViewer {
  return STAGE_METHODS.every(
    (name) => typeof Reflect.get(element, name) === 'function',
  );
}

/** Seen from a little above, like a visitor in front of a plinth. */
export const STAGE_POLAR_DEG = 78;
const MIN_POLAR_DEG = 64;
const MAX_POLAR_DEG = 86;

/** Share of the element the object may fill: its width, and its upper half. */
const MAX_WIDTH_SHARE = 0.72;
const MAX_HEIGHT_SHARE = 0.93;

const SMALLEST_METRES = 0.0001;

export interface StageFrame {
  /** Centre of the base of the object, in model metres. */
  target: readonly [number, number, number];
  /** Distance of the camera from the target, in metres. */
  radius: number;
  /** Width of the object as a share of the width of the element. */
  span: number;
}

export interface StageViewport {
  width: number;
  height: number;
}

/**
 * The camera that shows the object standing on the middle of the element,
 * as large as the plinth allows, for a vertical field of view in degrees.
 */
export function stageFrame(
  size: Vector3D,
  center: Vector3D,
  fieldOfViewDeg: number,
  viewport: StageViewport,
): StageFrame {
  const footprint = Math.max(size.x, size.z, SMALLEST_METRES);
  const height = Math.max(size.y, SMALLEST_METRES);
  const pixelsPerMetre = Math.min(
    (viewport.width * MAX_WIDTH_SHARE) / footprint,
    ((viewport.height / 2) * MAX_HEIGHT_SHARE) / height,
  );
  const halfFieldOfView = (fieldOfViewDeg * Math.PI) / 360;
  return {
    target: [center.x, center.y - size.y / 2, center.z],
    radius:
      viewport.height / 2 / (pixelsPerMetre * Math.tan(halfFieldOfView)),
    span: (footprint * pixelsPerMetre) / viewport.width,
  };
}

function metres(value: number): string {
  return `${value.toFixed(5)}m`;
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    // A hidden tab has no animation frame: the timer keeps the promise alive.
    const timer = window.setTimeout(resolve, 250);
    window.requestAnimationFrame(() => {
      window.clearTimeout(timer);
      resolve();
    });
  });
}

/** Waits for model-viewer to draw `count` frames with the current camera. */
export async function afterFrames(count: number): Promise<void> {
  for (let frame = 0; frame < count; frame += 1) {
    await nextFrame();
  }
}

/**
 * Places the camera of a loaded model so the object stands on the plinth.
 * Returns the width of the object as a share of the element, or null when
 * the element has no size yet.
 */
export async function standOnPlinth(
  viewer: StageViewer,
): Promise<number | null> {
  const size = viewer.getDimensions();
  const center = viewer.getBoundingBoxCenter();
  const viewport = { width: viewer.clientWidth, height: viewer.clientHeight };
  if (viewport.width === 0 || viewport.height === 0) {
    return null;
  }
  const base = stageFrame(size, center, 30, viewport).target;
  viewer.cameraTarget = base.map(metres).join(' ');
  // The framing follows the target: model-viewer may widen the field of view
  // for a narrow element, so the distance is computed from the one it uses.
  await viewer.updateFraming();
  viewer.jumpCameraToGoal();
  await nextFrame();
  const { radius, span } = stageFrame(
    size,
    center,
    viewer.getFieldOfView(),
    viewport,
  );
  viewer.maxCameraOrbit = `auto ${String(MAX_POLAR_DEG)}deg ${metres(radius)}`;
  viewer.minCameraOrbit = `auto ${String(MIN_POLAR_DEG)}deg ${metres(radius)}`;
  viewer.cameraOrbit = `0deg ${String(STAGE_POLAR_DEG)}deg ${metres(radius)}`;
  viewer.jumpCameraToGoal();
  return span;
}
