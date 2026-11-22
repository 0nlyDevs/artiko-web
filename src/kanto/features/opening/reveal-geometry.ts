/*
 * Geometry of the reveal, as pure functions: the hole of the cover, the scale
 * at which the O has left the screen, and the scale at each instant.
 */

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

/**
 * The hole of the cover at scale 1: a closed outline around `centre`, given
 * by one radius per direction (direction `k` at the angle `k * 2π / n`, from
 * the x axis towards the y axis).
 */
export interface Hole {
  centre: Point;
  radii: readonly number[];
}

/**
 * The outline that runs in the middle of an ink ring. A hole cut along it
 * has its edge under the ink all the way round: no cover shows inside the
 * ring and no page shows outside it, whatever the shape of the glyph.
 */
export function midRing(
  inner: readonly number[],
  outer: readonly number[],
): number[] {
  return inner.map((radius, index) => (radius + (outer[index] ?? radius)) / 2);
}

/**
 * The part of an ink ring that lies around its middle: `share` of the way
 * from the middle to each edge. It is the band of ink the reveal draws over
 * the edge of the hole, inside the ink of the O.
 */
export function ringBand(
  inner: readonly number[],
  outer: readonly number[],
  share: number,
): { inner: number[]; outer: number[] } {
  const middle = midRing(inner, outer);
  return {
    inner: middle.map(
      (radius, index) => radius - (radius - (inner[index] ?? radius)) * share,
    ),
    outer: middle.map(
      (radius, index) => radius + ((outer[index] ?? radius) - radius) * share,
    ),
  };
}

/** A round hole, for the simple reveal that does not follow a glyph. */
export function roundHole(centre: Point, directions = 48): Hole {
  return { centre, radii: Array.from({ length: directions }, () => 1) };
}

function round(value: number): string {
  return String(Math.round(value * 100) / 100);
}

/** A closed outline around `centre`, as the sub-path of an SVG path. */
function outline(centre: Point, radii: readonly number[], scale: number): string {
  const count = radii.length;
  const points = radii.map((radius, index) => {
    const angle = (index * 2 * Math.PI) / count;
    const x = centre.x + Math.cos(angle) * radius * scale;
    const y = centre.y + Math.sin(angle) * radius * scale;
    return `${round(x)} ${round(y)}`;
  });
  return `M${points.join('L')}Z`;
}

/**
 * Path of the cover: the whole viewport, minus the hole at the given scale.
 * It is filled with the even-odd rule, so the second outline is a real hole.
 */
export function coverPath(viewport: Size, hole: Hole, scale: number): string {
  return `M0 0H${round(viewport.width)}V${round(viewport.height)}H0Z${outline(hole.centre, hole.radii, scale)}`;
}

/**
 * Path of a ring between two outlines around the same centre, at the given
 * scale. Filled with the even-odd rule.
 */
export function ringPath(
  centre: Point,
  inner: readonly number[],
  outer: readonly number[],
  scale: number,
): string {
  return `${outline(centre, outer, scale)}${outline(centre, inner, scale)}`;
}

/** Path of the cover before the reveal: the whole viewport, with no hole. */
export const CLOSED_COVER_PATH = 'M-100000 -100000H100000V100000H-100000Z';

function radiusTowards(radii: readonly number[], angle: number): number {
  const count = radii.length;
  const turn = 2 * Math.PI;
  const position = ((((angle % turn) + turn) % turn) / turn) * count;
  const index = Math.floor(position) % count;
  const next = (index + 1) % count;
  const mix = position - Math.floor(position);
  return (radii[index] ?? 0) * (1 - mix) + (radii[next] ?? 0) * mix;
}

/**
 * The scale at which an outline around `centre` holds the whole viewport.
 * Given the inner edge of the O, it is the scale at which the last of the ink
 * has left the screen.
 */
export function scaleToClear(
  viewport: Size,
  centre: Point,
  radii: readonly number[],
): number {
  const corners: Point[] = [
    { x: 0, y: 0 },
    { x: viewport.width, y: 0 },
    { x: viewport.width, y: viewport.height },
    { x: 0, y: viewport.height },
  ];
  let scale = 1;
  for (const corner of corners) {
    const dx = corner.x - centre.x;
    const dy = corner.y - centre.y;
    const reach = radiusTowards(radii, Math.atan2(dy, dx));
    if (reach > 0) {
      scale = Math.max(scale, Math.hypot(dx, dy) / reach);
    }
  }
  return scale;
}

/**
 * Scale of the word at progress `t` (0 to 1) of the reveal. It grows by the
 * same ratio in equal times, like a camera moving through the O at a steady
 * pace, with a soft start.
 */
export function revealScale(t: number, endScale: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  const eased = clamped * clamped * (3 - 2 * clamped) * 0.35 + clamped * 0.65;
  return Math.pow(Math.max(1, endScale), eased);
}
