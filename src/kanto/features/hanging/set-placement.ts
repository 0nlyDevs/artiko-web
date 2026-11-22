import type { RefObject } from 'react';
import { useLayoutEffect } from 'react';

/*
 * The red room photograph behind the ceremony. Figma places it at (-329, -56),
 * 1830x1011, on the 1440x900 stage (the values of the photographic room). Here
 * it is tied to the point of the floor under the work, stage (507, 872), so
 * the plinth stands on the parquet at any viewport size, and it grows around
 * that point until it covers the set on the left, on the right and at the
 * top. Below the photograph the stylesheet fades the floor to black, so a
 * tall viewport does not magnify the wall.
 */
const PHOTO = { width: 1830, height: 1011 };
/** Stage offset of the floor point from the top left corner of the photograph. */
const FLOOR_POINT = { x: 507 + 329, y: 872 + 56 };

export interface SetGeometry {
  /** Size of the box the photograph must cover, in CSS pixels. */
  width: number;
  height: number;
  /** The floor point under the work, in CSS pixels from the top left of the box. */
  floorX: number;
  floorY: number;
  /** One stage pixel of the set, in CSS pixels. */
  unit: number;
}

export interface PhotoPlacement {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function placePhoto(set: SetGeometry): PhotoPlacement {
  const left = set.floorX - FLOOR_POINT.x * set.unit;
  const top = set.floorY - FLOOR_POINT.y * set.unit;
  const width = PHOTO.width * set.unit;
  const height = PHOTO.height * set.unit;
  const scale = Math.max(
    1,
    set.floorX / (set.floorX - left),
    (set.width - set.floorX) / (left + width - set.floorX),
    set.floorY / (set.floorY - top),
  );
  return {
    left: set.floorX + (left - set.floorX) * scale,
    top: set.floorY + (top - set.floorY) * scale,
    width: width * scale,
    height: height * scale,
  };
}

/** Width of the probe that measures one set unit, in set units. */
const PROBE_UNITS = 100;

/**
 * Writes the placement of the photograph to CSS variables of the set. The
 * probe is an empty element that the stylesheet puts on the floor point with
 * a width of 100 set units, so the layout numbers live in the CSS only.
 */
export function useSetPlacement(
  setRef: RefObject<HTMLElement | null>,
  probeRef: RefObject<HTMLElement | null>,
): void {
  useLayoutEffect(() => {
    const set = setRef.current;
    const probe = probeRef.current;
    if (set === null || probe === null) {
      return;
    }
    const update = (): void => {
      const unit = probe.offsetWidth / PROBE_UNITS;
      if (unit <= 0 || set.clientWidth === 0 || set.clientHeight === 0) {
        return;
      }
      const placement = placePhoto({
        width: set.clientWidth,
        height: set.clientHeight,
        floorX: probe.offsetLeft,
        floorY: probe.offsetTop,
        unit,
      });
      set.style.setProperty('--photo-left', `${String(placement.left)}px`);
      set.style.setProperty('--photo-top', `${String(placement.top)}px`);
      set.style.setProperty('--photo-width', `${String(placement.width)}px`);
      set.style.setProperty('--photo-height', `${String(placement.height)}px`);
    };
    update();
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('resize', update);
    };
  }, [setRef, probeRef]);
}
