export type ViewName = "front" | "back" | "left" | "right" | "top";

interface Orbit {
  azimuthDegrees: number;
  polarDegrees: number;
}

const ORBITS: Record<ViewName, Orbit> = {
  front: { azimuthDegrees: 0, polarDegrees: 75 },
  back: { azimuthDegrees: 180, polarDegrees: 75 },
  left: { azimuthDegrees: -90, polarDegrees: 75 },
  right: { azimuthDegrees: 90, polarDegrees: 75 },
  top: { azimuthDegrees: 0, polarDegrees: 0 },
};

export const VIEW_NAMES = Object.keys(ORBITS) as ViewName[];
export const FRONT_ORBIT = ORBITS.front;

/** Polar angle stops at the horizon: the underside of a scan is rarely captured. */
export const MIN_CAMERA_ORBIT = "auto 0deg auto";
export const MAX_CAMERA_ORBIT = "auto 90deg auto";

export function cameraOrbitOf(view: ViewName): string {
  const { azimuthDegrees, polarDegrees } = ORBITS[view];
  return `${azimuthDegrees}deg ${polarDegrees}deg auto`;
}
