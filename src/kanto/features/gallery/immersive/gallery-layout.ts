import type { RoomSlug } from '../data/rooms';
import type { SceneKind, SceneWork } from './scene-annex';

/*
 * Pure scene geometry, in metres. The wall that carries the works is the
 * plane z = 0 and the visitor walks along the x axis in front of it.
 * Everything here is deterministic so the camera, the lights and the DOM
 * overlay agree on where each work is.
 *
 * The composition follows the Figma gallery frames: the current work sits
 * in the left third of the picture, the wall text occupies the right, and
 * a band of parquet shows under the baseboard.
 */
export const ROOM = {
  wallZ: 0,
  depth: 9,
  height: 4.4,
  /** Free wall on each side of the first and last works. */
  padding: 3.6,
  /** Distance between two consecutive works. */
  spacing: 4.2,
  /** Height of the centre of a painting. */
  hangHeight: 1.38,
  eyeHeight: 1.5,
  /** Where the visitor looks on the wall: a little below the works, so the floor shows. */
  lookHeight: 1.22,
  /** Distance of the visitor rail from the wall. */
  railZ: 4.7,
  /** Pedestals stand in front of the wall. */
  sculptureZ: 1.5,
  pedestalHeight: 1.05,
  pedestalSize: 0.5,
  baseboardHeight: 0.22,
  /** Width of the gilded moulding around a canvas, and how far it stands off the wall. */
  frameWidth: 0.085,
  frameDepth: 0.07,
  /** How far the camera stands to the right of the current work, so it appears left of centre. */
  compositionOffset: 0.78,
} as const;

/** Vertical field of view of the camera, in degrees. */
export const CAMERA_FOV = 36;
const HALF_FOV_TAN = Math.tan((CAMERA_FOV * Math.PI) / 360);

/*
 * How a focused work sits in the picture. A share is a fraction of the
 * viewport: the camera distance is derived from the size of the work, so a
 * small study and a large canvas read the same once in focus.
 */
export const FOCUS = {
  /** Share of the viewport height filled by a painting with its frame. */
  paintingFill: 0.62,
  /** Share of the viewport height filled by an object and the top of its pedestal. */
  sculptureFill: 0.55,
  /** Share of the viewport width a work may fill, which governs on a portrait phone. */
  widthFill: 0.86,
  /** How much of the pedestal stays in the picture under an object. */
  pedestalShown: 0.16,
  /** How high a focused object floats above its pedestal. */
  lift: 0.05,
  /** The camera looks down at an object from this angle, in radians. */
  elevation: 0.21,
  /** The work sits this share of the viewport height above the middle, clear of the caption. */
  rise: 0.025,
  /** The camera never comes closer than this to the wall or to the axis of an object. */
  minDistance: 0.85,
  /** Free space kept between the camera and the surface of an object. */
  clearance: 0.5,
  /** The camera stays this far from the back wall of the room. */
  backMargin: 1,
  /**
   * Wheel and pinch move the camera between these shares of the fitted
   * distance. A painting only leans in: closer, its frame would slide under
   * the caption, and the close-up viewer is there for the details.
   */
  dolly: {
    painting: [0.86, 1.15],
    sculpture: [0.7, 1.15],
  },
} as const;

/** How close and how far wheel and pinch may bring the camera of the focus. */
export function dollyRange(kind: SceneKind): readonly [number, number] {
  return FOCUS.dolly[kind];
}

export interface PlacedArtwork {
  readonly id: string;
  readonly index: number;
  readonly kind: SceneKind;
  readonly room: RoomSlug;
  /** Centre of the canvas, or of the object standing on its pedestal. */
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly width: number;
  readonly height: number;
}

export function placeArtworks(works: readonly SceneWork[]): PlacedArtwork[] {
  return works.map((work, index) => {
    const x = ROOM.padding + index * ROOM.spacing;
    if (work.kind === 'sculpture') {
      return {
        id: work.id,
        index,
        kind: work.kind,
        room: work.roomSlug,
        x,
        y: ROOM.pedestalHeight + work.height / 2,
        z: ROOM.sculptureZ,
        width: work.width,
        height: work.height,
      };
    }
    return {
      id: work.id,
      index,
      kind: work.kind,
      room: work.roomSlug,
      x,
      y: ROOM.hangHeight,
      z: ROOM.wallZ,
      width: work.width,
      height: work.height,
    };
  });
}

export interface RailBounds {
  readonly min: number;
  readonly max: number;
}

/** The rail stops in front of the first and the last work. */
export function railBounds(placed: readonly PlacedArtwork[]): RailBounds {
  const first = placed[0];
  const last = placed[placed.length - 1];
  if (first === undefined || last === undefined) {
    return { min: 0, max: 0 };
  }
  return { min: first.x, max: last.x };
}

/** Total length of the room along x. The room starts at x = 0. */
export function roomLength(placed: readonly PlacedArtwork[]): number {
  return railBounds(placed).max + ROOM.padding;
}

export interface WallSegment {
  readonly room: RoomSlug;
  readonly start: number;
  readonly end: number;
}

/**
 * Splits the wall into one segment per consecutive group of works from
 * the same room, with the boundary halfway between neighbouring works.
 */
export function wallSegments(placed: readonly PlacedArtwork[]): WallSegment[] {
  const length = roomLength(placed);
  const segments: WallSegment[] = [];
  for (const work of placed) {
    const previous = segments[segments.length - 1];
    if (previous && previous.room === work.room) {
      continue;
    }
    const before = placed[work.index - 1];
    const start = before ? (before.x + work.x) / 2 : 0;
    if (previous) {
      segments[segments.length - 1] = { ...previous, end: start };
    }
    segments.push({ room: work.room, start, end: length });
  }
  return segments;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function nearestIndex(
  placed: readonly PlacedArtwork[],
  x: number,
): number {
  let best = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const work of placed) {
    const distance = Math.abs(work.x - x);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = work.index;
    }
  }
  return best;
}

/**
 * How lit a work is, from 0 (far from the visitor) to 1 (in front of them).
 * A smoothstep keeps the transition continuous, so spots never flicker.
 */
export function spotActivity(
  distance: number,
  spacing: number = ROOM.spacing,
): number {
  const t = clamp(1 - Math.abs(distance) / (spacing * 1.15), 0, 1);
  return t * t * (3 - 2 * t);
}

/** Frame-rate independent exponential smoothing. */
export function damp(
  current: number,
  target: number,
  lambda: number,
  dt: number,
): number {
  return target + (current - target) * Math.exp(-lambda * dt);
}

export function easeOutCubic(t: number): number {
  const u = clamp(t, 0, 1);
  return 1 - (1 - u) ** 3;
}

export interface CameraPose {
  readonly position: readonly [number, number, number];
  readonly target: readonly [number, number, number];
}

/** Standing on the rail, looking straight at the wall, the work to the left. */
export function visitPose(railX: number): CameraPose {
  const x = railX + ROOM.compositionOffset;
  return {
    position: [x, ROOM.eyeHeight, ROOM.railZ],
    target: [x, ROOM.lookHeight, ROOM.wallZ],
  };
}

/**
 * The notice is open: the visitor steps a little closer and the work stays
 * in the left part of the picture, clear of the panel on the right.
 */
export function noticePose(placed: PlacedArtwork): CameraPose {
  const x = placed.x + ROOM.compositionOffset * 0.9;
  const z = placed.kind === 'sculpture' ? placed.z + 3.4 : ROOM.railZ * 0.82;
  const y =
    placed.kind === 'sculpture' ? placed.y + 0.05 : ROOM.lookHeight + 0.08;
  return {
    position: [x, ROOM.eyeHeight, z],
    target: [x, y, placed.z],
  };
}

/** What the camera frames in focus: the framed canvas, or the object and the top of its pedestal. */
export interface FocusSubject {
  readonly centre: readonly [number, number, number];
  readonly width: number;
  readonly height: number;
}

/**
 * `footprint` is the measured diameter of an object seen from above, once
 * its model has loaded. It replaces the nominal width, which only knows the
 * display height of the object.
 */
export function focusSubject(
  placed: PlacedArtwork,
  footprint: number = placed.width,
): FocusSubject {
  if (placed.kind === 'sculpture') {
    const bottom = ROOM.pedestalHeight - FOCUS.pedestalShown;
    const top = ROOM.pedestalHeight + FOCUS.lift + placed.height;
    return {
      centre: [placed.x, (bottom + top) / 2, placed.z],
      width: footprint,
      height: top - bottom,
    };
  }
  // Measured on the face of the frame, which stands in front of the canvas.
  return {
    centre: [placed.x, placed.y, placed.z + ROOM.frameDepth],
    width: placed.width + 2 * ROOM.frameWidth,
    height: placed.height + 2 * ROOM.frameWidth,
  };
}

export interface FocusOptions {
  /** Share of the fitted distance asked by wheel or pinch. 1 is the fitted view. */
  readonly dolly?: number | undefined;
  /** Measured diameter of an object, see focusSubject. */
  readonly footprint?: number | undefined;
}

/** A viewport that has not been measured yet counts as square. */
function safeAspect(aspect: number): number {
  return aspect > 0 && Number.isFinite(aspect) ? aspect : 1;
}

/** Height of the subject as the camera sees it: an object is seen from above, which shortens it. */
function apparentHeight(placed: PlacedArtwork, subject: FocusSubject): number {
  return (
    subject.height *
    (placed.kind === 'sculpture' ? Math.cos(FOCUS.elevation) : 1)
  );
}

/**
 * Distance from the camera to the centre of a focused work, along the line
 * of sight. The work fills its share of the viewport height, unless its
 * width would overflow a narrow viewport: the wider constraint wins. The
 * result stays in front of the work and inside the room.
 */
export function focusDistance(
  placed: PlacedArtwork,
  aspect: number,
  { dolly = 1, footprint }: FocusOptions = {},
): number {
  const subject = focusSubject(placed, footprint);
  const sculpture = placed.kind === 'sculpture';
  const fill = sculpture ? FOCUS.sculptureFill : FOCUS.paintingFill;
  const byHeight =
    apparentHeight(placed, subject) / (2 * HALF_FOV_TAN * fill);
  const byWidth =
    subject.width / (2 * HALF_FOV_TAN * safeAspect(aspect) * FOCUS.widthFill);
  const nearest = sculpture
    ? Math.max(FOCUS.minDistance, subject.width / 2 + FOCUS.clearance)
    : FOCUS.minDistance;
  const farthest = Math.max(
    nearest,
    ROOM.depth - FOCUS.backMargin - subject.centre[2],
  );
  const [closest, furthest] = dollyRange(placed.kind);
  const wanted = Math.max(byHeight, byWidth) * clamp(dolly, closest, furthest);
  return clamp(wanted, nearest, farthest);
}

/**
 * A work is in focus: the camera comes close and centres it. A painting is
 * seen square on. An object is seen from a little above, like a visitor
 * leaning over its pedestal, and never from higher than a standing visitor
 * would unless the object itself is taller.
 */
export function focusPose(
  placed: PlacedArtwork,
  aspect: number,
  options: FocusOptions = {},
): CameraPose {
  const [x, centreY, z] = focusSubject(placed, options.footprint).centre;
  const distance = focusDistance(placed, aspect, options);
  // Looking a little below the work lifts it clear of the caption.
  const y = centreY - FOCUS.rise * 2 * distance * HALF_FOV_TAN;
  if (placed.kind !== 'sculpture') {
    return { position: [x, y, z + distance], target: [x, y, z] };
  }
  const climb = Math.min(
    distance * Math.sin(FOCUS.elevation),
    ROOM.eyeHeight + 0.1 - centreY,
  );
  const run = Math.sqrt(Math.max(distance * distance - climb * climb, 0.01));
  return { position: [x, y + climb, z + run], target: [x, y, z] };
}

export interface FocusFrame {
  /** Share of the viewport width the focused work covers, from 0 to 1. */
  readonly width: number;
  /** Share of the viewport height it covers, from 0 to 1. */
  readonly height: number;
}

/**
 * What a focused work covers of the picture once the camera has arrived.
 * The veil of the focus opens on it, so the room goes dark right up to the
 * work and never over it.
 */
export function focusFrame(
  placed: PlacedArtwork,
  aspect: number,
  options: FocusOptions = {},
): FocusFrame {
  const subject = focusSubject(placed, options.footprint);
  const visibleHeight =
    2 * focusDistance(placed, aspect, options) * HALF_FOV_TAN;
  return {
    width: clamp(subject.width / (visibleHeight * safeAspect(aspect)), 0, 1),
    height: clamp(apparentHeight(placed, subject) / visibleHeight, 0, 1),
  };
}

/** Highest angle the camera may reach above a focused object, in radians. */
const ORBIT_MAX = 1.1;

/**
 * Raises or lowers the camera on an arc around what it looks at, keeping
 * its distance: the vertical drag on a focused object. `floor` is the
 * lowest height the camera may reach, so it never looks at an object from
 * underneath.
 */
export function orbitPose(
  pose: CameraPose,
  angle: number,
  floor: number = Number.NEGATIVE_INFINITY,
): CameraPose {
  const dx = pose.position[0] - pose.target[0];
  const dy = pose.position[1] - pose.target[1];
  const dz = pose.position[2] - pose.target[2];
  const run = Math.hypot(dx, dz);
  const distance = Math.hypot(run, dy);
  if (run < 1e-6 || distance < 1e-6) {
    return pose;
  }
  const lowest = Math.asin(clamp((floor - pose.target[1]) / distance, -1, 1));
  const elevation = clamp(
    Math.atan2(dy, run) + angle,
    Math.max(-ORBIT_MAX, lowest),
    ORBIT_MAX,
  );
  const reach = (distance * Math.cos(elevation)) / run;
  return {
    position: [
      pose.target[0] + dx * reach,
      pose.target[1] + distance * Math.sin(elevation),
      pose.target[2] + dz * reach,
    ],
    target: pose.target,
  };
}

const TURN = Math.PI * 2;

/** The same orientation, expressed between -π and π. */
export function wrapAngle(angle: number): number {
  const wrapped = ((((angle + Math.PI) % TURN) + TURN) % TURN) - Math.PI;
  return wrapped === -Math.PI ? Math.PI : wrapped;
}

/** The whole number of turns closest to an angle: where a turned object rests. */
export function nearestTurn(angle: number): number {
  return Math.round(angle / TURN) * TURN;
}

/** The entrance travelling: from the back of the room down to the rail. */
export function introPose(progress: number, railX: number): CameraPose {
  const p = easeOutCubic(progress);
  const end = visitPose(railX);
  const startX = end.position[0] - 2.6;
  const startY = 2.0;
  const startZ = ROOM.depth - 0.4;
  return {
    position: [
      startX + (end.position[0] - startX) * p,
      startY + (end.position[1] - startY) * p,
      startZ + (end.position[2] - startZ) * p,
    ],
    target: [
      end.target[0] - 0.9 * (1 - p),
      end.target[1] + 0.3 * (1 - p),
      end.target[2],
    ],
  };
}
