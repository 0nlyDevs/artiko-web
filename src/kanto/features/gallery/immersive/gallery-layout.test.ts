import { PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import {
  CAMERA_FOV,
  FOCUS,
  ROOM,
  damp,
  focusDistance,
  focusFrame,
  focusPose,
  dollyRange,
  focusSubject,
  introPose,
  nearestIndex,
  nearestTurn,
  noticePose,
  orbitPose,
  placeArtworks,
  railBounds,
  roomLength,
  spotActivity,
  visitPose,
  wallSegments,
  wrapAngle,
} from './gallery-layout';
import type { CameraPose, PlacedArtwork } from './gallery-layout';
import type { SceneKind, SceneWork } from './scene-annex';

function work(
  id: string,
  roomSlug: 'peinture' | 'sculpture',
  kind: SceneKind,
  height = 0.9,
  width = 0.7,
): SceneWork {
  return {
    id,
    roomSlug,
    roomIndex: roomSlug === 'peinture' ? 0 : 1,
    artworkIndex: 0,
    kind,
    width,
    height,
    image: kind === 'painting' ? '/media/x.webp' : null,
    model: null,
  };
}

const WORKS = [
  work('peinture/01', 'peinture', 'painting'),
  work('peinture/02', 'peinture', 'painting'),
  work('sculpture/01', 'sculpture', 'sculpture', 0.4),
];

describe('placeArtworks', () => {
  const placed = placeArtworks(WORKS);

  it('spaces the works along the wall from the padding', () => {
    expect(placed.map((item) => item.x)).toEqual([
      ROOM.padding,
      ROOM.padding + ROOM.spacing,
      ROOM.padding + 2 * ROOM.spacing,
    ]);
  });

  it('hangs paintings on the wall and stands sculptures on their pedestal', () => {
    expect(placed[0]).toMatchObject({ y: ROOM.hangHeight, z: ROOM.wallZ });
    expect(placed[2]).toMatchObject({
      y: ROOM.pedestalHeight + 0.2,
      z: ROOM.sculptureZ,
      room: 'sculpture',
    });
  });

  it('bounds the rail by the first and last works', () => {
    expect(railBounds(placed)).toEqual({
      min: ROOM.padding,
      max: ROOM.padding + 2 * ROOM.spacing,
    });
    expect(railBounds([])).toEqual({ min: 0, max: 0 });
    expect(roomLength(placed)).toBeCloseTo(ROOM.padding * 2 + 2 * ROOM.spacing);
  });

  it('splits the wall into one segment per room, halfway between neighbours', () => {
    const segments = wallSegments(placed);
    const boundary = ROOM.padding + 1.5 * ROOM.spacing;
    expect(segments).toEqual([
      { room: 'peinture', start: 0, end: boundary },
      { room: 'sculpture', start: boundary, end: roomLength(placed) },
    ]);
  });

  it('finds the nearest work of a rail position', () => {
    expect(nearestIndex(placed, 0)).toBe(0);
    expect(nearestIndex(placed, ROOM.padding + ROOM.spacing * 1.4)).toBe(1);
    expect(nearestIndex(placed, 100)).toBe(2);
  });
});

describe('lighting and motion helpers', () => {
  it('lights a work fully in front of the visitor and not at all far away', () => {
    expect(spotActivity(0)).toBe(1);
    expect(spotActivity(ROOM.spacing * 2)).toBe(0);
    expect(spotActivity(ROOM.spacing * 0.5)).toBeGreaterThan(
      spotActivity(ROOM.spacing),
    );
  });

  it('damps towards the target without overshoot', () => {
    const next = damp(0, 1, 5, 0.1);
    expect(next).toBeGreaterThan(0);
    expect(next).toBeLessThan(1);
    expect(damp(1, 1, 5, 0.1)).toBe(1);
  });
});

describe('camera poses', () => {
  const placed = placeArtworks(WORKS);

  it('stands on the rail, the work left of centre', () => {
    const pose = visitPose(ROOM.padding);
    expect(pose.position).toEqual([
      ROOM.padding + ROOM.compositionOffset,
      ROOM.eyeHeight,
      ROOM.railZ,
    ]);
    expect(pose.target[2]).toBe(ROOM.wallZ);
  });

  it('steps closer for the notice and looks at the work', () => {
    const painting = placed[0];
    const sculpture = placed[2];
    if (painting === undefined || sculpture === undefined) {
      throw new Error('fixtures');
    }
    expect(noticePose(painting).position[2]).toBeLessThan(ROOM.railZ);
    expect(noticePose(sculpture).target[2]).toBe(ROOM.sculptureZ);
  });

  it('ends the entrance travelling exactly on the visit pose', () => {
    expect(introPose(1, ROOM.padding)).toEqual(visitPose(ROOM.padding));
    expect(introPose(0, ROOM.padding).position[2]).toBeCloseTo(
      ROOM.depth - 0.4,
    );
  });
});

/*
 * The focus pose is checked against a real camera: the corners of what the
 * pose is meant to frame are projected, and their spread is the share of
 * the viewport the work fills.
 */
const LANDSCAPE = 1440 / 900;
const PORTRAIT = 390 / 844;

interface Shares {
  /** Share of the viewport width and height the subject fills. */
  readonly width: number;
  readonly height: number;
  /** Where its centre sits, from -1 (left, bottom) to 1 (right, top). */
  readonly centreX: number;
  readonly centreY: number;
}

function project(
  pose: CameraPose,
  aspect: number,
  point: readonly [number, number, number],
): Vector3 {
  const camera = new PerspectiveCamera(CAMERA_FOV, aspect, 0.05, 60);
  camera.position.set(pose.position[0], pose.position[1], pose.position[2]);
  camera.lookAt(pose.target[0], pose.target[1], pose.target[2]);
  camera.updateMatrixWorld(true);
  return new Vector3(point[0], point[1], point[2]).project(camera);
}

function framing(
  placed: PlacedArtwork,
  aspect: number,
  pose: CameraPose = focusPose(placed, aspect),
  footprint?: number,
): Shares {
  const subject = focusSubject(placed, footprint);
  const [x, y, z] = subject.centre;
  const top = project(pose, aspect, [x, y + subject.height / 2, z]);
  const bottom = project(pose, aspect, [x, y - subject.height / 2, z]);
  const left = project(pose, aspect, [x - subject.width / 2, y, z]);
  const right = project(pose, aspect, [x + subject.width / 2, y, z]);
  return {
    width: (right.x - left.x) / 2,
    height: (top.y - bottom.y) / 2,
    centreX: (left.x + right.x) / 2,
    centreY: (top.y + bottom.y) / 2,
  };
}

function only(works: SceneWork[]): PlacedArtwork {
  const placed = placeArtworks(works)[0];
  if (placed === undefined) {
    throw new Error('fixtures');
  }
  return placed;
}

describe('focus pose', () => {
  // "Femme malgache", 106,8 x 71,1 cm, and "Antongona", 23,5 x 34,3 cm.
  const tall = only([work('peinture/01', 'peinture', 'painting', 1.068, 0.711)]);
  const wide = only([work('peinture/02', 'peinture', 'painting', 0.235, 0.343)]);
  const pot = only([work('sculpture/01', 'sculpture', 'sculpture', 0.37, 0.3)]);

  it('fills the intended share of the viewport height with a tall painting and its frame', () => {
    const shares = framing(tall, LANDSCAPE);
    expect(shares.height).toBeCloseTo(FOCUS.paintingFill, 2);
    expect(shares.height).toBeGreaterThanOrEqual(0.6);
    expect(shares.height).toBeLessThanOrEqual(0.65);
    expect(shares.width).toBeLessThan(FOCUS.widthFill);
  });

  it('fills the same share with a small, wide painting by coming closer', () => {
    expect(framing(wide, LANDSCAPE).height).toBeCloseTo(FOCUS.paintingFill, 2);
    expect(focusDistance(wide, LANDSCAPE)).toBeLessThan(
      focusDistance(tall, LANDSCAPE),
    );
  });

  it('fills about 55 percent with a sculpture and the top of its pedestal, seen from above', () => {
    const pose = focusPose(pot, LANDSCAPE);
    const shares = framing(pot, LANDSCAPE, pose);
    expect(shares.height).toBeGreaterThan(FOCUS.sculptureFill - 0.02);
    expect(shares.height).toBeLessThan(FOCUS.sculptureFill + 0.02);
    // The subject runs from under the top of the pedestal to the top of the lifted object.
    const subject = focusSubject(pot);
    expect(subject.centre[1] - subject.height / 2).toBeCloseTo(
      ROOM.pedestalHeight - FOCUS.pedestalShown,
    );
    expect(subject.centre[1] + subject.height / 2).toBeCloseTo(
      ROOM.pedestalHeight + FOCUS.lift + 0.37,
    );
    expect(pose.position[1]).toBeGreaterThan(pose.target[1]);
    expect(pose.position[1]).toBeLessThanOrEqual(ROOM.eyeHeight + 0.1);
  });

  it('centres the work, a little above the middle to clear the caption', () => {
    for (const placed of [tall, wide]) {
      const shares = framing(placed, LANDSCAPE);
      expect(shares.centreX).toBeCloseTo(0, 5);
      expect(shares.centreY).toBeCloseTo(2 * FOCUS.rise, 3);
    }
    // Seen from above, the near top of an object reads larger: it sits a touch higher.
    const shares = framing(pot, LANDSCAPE);
    expect(shares.centreX).toBeCloseTo(0, 5);
    expect(shares.centreY).toBeGreaterThan(2 * FOCUS.rise - 0.01);
    expect(shares.centreY).toBeLessThan(2 * FOCUS.rise + 0.03);
  });

  it('fits the width of a 390x844 portrait viewport instead of overflowing it', () => {
    for (const placed of [tall, wide]) {
      const shares = framing(placed, PORTRAIT);
      expect(shares.width).toBeLessThanOrEqual(FOCUS.widthFill + 0.005);
      expect(shares.height).toBeLessThanOrEqual(FOCUS.paintingFill + 0.005);
    }
    // A painting wider than tall is bound by the width of a phone.
    expect(framing(wide, PORTRAIT).width).toBeCloseTo(FOCUS.widthFill, 2);
    // The measured width of an object, wider than its nominal one, governs.
    const measured = 0.65;
    const pose = focusPose(pot, PORTRAIT, { footprint: measured });
    expect(framing(pot, PORTRAIT, pose, measured).width).toBeCloseTo(
      FOCUS.widthFill,
      2,
    );
  });

  it('never crosses the wall, however small the painting or close the dolly', () => {
    const stamp = only([work('peinture/x', 'peinture', 'painting', 0.05, 0.05)]);
    for (const placed of [tall, wide, stamp]) {
      for (const dolly of [0.01, ...dollyRange('painting'), 1, 50]) {
        const pose = focusPose(placed, LANDSCAPE, { dolly });
        expect(pose.position[2]).toBeGreaterThanOrEqual(
          ROOM.wallZ + ROOM.frameDepth + FOCUS.minDistance - 1e-9,
        );
        expect(pose.position[2]).toBeLessThanOrEqual(
          ROOM.depth - FOCUS.backMargin + 1e-9,
        );
        expect(pose.target[2]).toBeCloseTo(ROOM.wallZ + ROOM.frameDepth);
      }
    }
  });

  it('stays in the room in front of a monumental painting', () => {
    const mural = only([work('peinture/y', 'peinture', 'painting', 3.6, 6)]);
    for (const aspect of [LANDSCAPE, PORTRAIT]) {
      const pose = focusPose(mural, aspect);
      expect(pose.position[2]).toBeLessThanOrEqual(
        ROOM.depth - FOCUS.backMargin + 1e-9,
      );
      expect(pose.position[2]).toBeGreaterThan(ROOM.wallZ);
    }
  });

  it('never enters the pedestal or the object, whatever its size', () => {
    const bead = only([work('sculpture/x', 'sculpture', 'sculpture', 0.03, 0.03)]);
    const drum = only([work('sculpture/y', 'sculpture', 'sculpture', 0.2, 0.3)]);
    const cases: [PlacedArtwork, number][] = [
      [pot, 0.3],
      [bead, 0.03],
      [drum, 1.4],
    ];
    for (const [placed, footprint] of cases) {
      for (const dolly of [0.01, 1, 50]) {
        const pose = focusPose(placed, LANDSCAPE, { dolly, footprint });
        const reach = Math.hypot(
          pose.position[0] - placed.x,
          pose.position[2] - placed.z,
        );
        expect(reach).toBeGreaterThan(
          Math.max(footprint, ROOM.pedestalSize) / 2 + 0.2,
        );
        expect(pose.position[1]).toBeGreaterThan(ROOM.pedestalHeight);
        expect(pose.position[2]).toBeLessThanOrEqual(
          ROOM.depth - FOCUS.backMargin + 1e-9,
        );
      }
    }
  });

  it('dollies within the range of the work and no further', () => {
    const fitted = focusDistance(tall, LANDSCAPE);
    const [closest, furthest] = dollyRange('painting');
    expect(focusDistance(tall, LANDSCAPE, { dolly: 0.9 })).toBeCloseTo(
      fitted * 0.9,
    );
    expect(focusDistance(tall, LANDSCAPE, { dolly: 0.1 })).toBeCloseTo(
      fitted * closest,
    );
    expect(focusDistance(tall, LANDSCAPE, { dolly: 9 })).toBeCloseTo(
      fitted * furthest,
    );
    // A painting only leans in: its frame stays clear of the caption.
    const leaning = focusPose(tall, LANDSCAPE, { dolly: 0 });
    expect(framing(tall, LANDSCAPE, leaning).height).toBeLessThan(0.75);
    // An object comes closer than that.
    const near = focusDistance(pot, LANDSCAPE, { dolly: 0 });
    expect(near).toBeCloseTo(
      focusDistance(pot, LANDSCAPE) * dollyRange('sculpture')[0],
    );
  });

  it('survives a viewport that has no size yet', () => {
    for (const aspect of [0, Number.NaN, Number.POSITIVE_INFINITY]) {
      const pose = focusPose(tall, aspect);
      expect(pose.position.every((value) => Number.isFinite(value))).toBe(true);
    }
  });

  it('reports what the work covers, for the veil that opens on it', () => {
    for (const aspect of [LANDSCAPE, PORTRAIT]) {
      for (const placed of [tall, wide, pot]) {
        const frame = focusFrame(placed, aspect);
        const shares = framing(placed, aspect);
        expect(frame.height).toBeCloseTo(shares.height, 1);
        expect(frame.width).toBeCloseTo(shares.width, 1);
      }
    }
    // The veil opens wider when the camera leans in.
    expect(focusFrame(tall, LANDSCAPE, { dolly: 0.1 }).height).toBeCloseTo(
      FOCUS.paintingFill / dollyRange('painting')[0],
    );
  });
});

describe('orbit of a focused object', () => {
  const pose: CameraPose = { position: [3, 1.5, 4], target: [3, 1.2, 1.5] };
  const distance = (value: CameraPose): number =>
    Math.hypot(
      value.position[0] - value.target[0],
      value.position[1] - value.target[1],
      value.position[2] - value.target[2],
    );

  it('raises the camera on an arc, keeping its distance and what it looks at', () => {
    const raised = orbitPose(pose, 0.4);
    expect(raised.position[1]).toBeGreaterThan(pose.position[1]);
    expect(raised.position[2]).toBeLessThan(pose.position[2]);
    expect(raised.position[0]).toBeCloseTo(pose.position[0]);
    expect(distance(raised)).toBeCloseTo(distance(pose));
    expect(raised.target).toEqual(pose.target);
    expect(orbitPose(pose, 0).position[1]).toBeCloseTo(pose.position[1]);
  });

  it('stops above the floor it is given, so the underside never shows', () => {
    const floor = 1.14;
    const lowered = orbitPose(pose, -1.2, floor);
    expect(lowered.position[1]).toBeGreaterThanOrEqual(floor - 1e-9);
    expect(distance(lowered)).toBeCloseTo(distance(pose));
    // Without a floor the same drag would go under the object.
    expect(orbitPose(pose, -1.2).position[1]).toBeLessThan(floor);
  });

  it('never goes over the top of the object', () => {
    const top = orbitPose(pose, 5);
    expect(top.position[2]).toBeGreaterThan(pose.target[2]);
    expect(top.position[1]).toBeLessThan(pose.target[1] + distance(pose));
  });

  it('leaves a camera straight above its target alone', () => {
    const above: CameraPose = { position: [1, 3, 1], target: [1, 1, 1] };
    expect(orbitPose(above, 0.3)).toBe(above);
  });
});

describe('angles of a turned object', () => {
  it('wraps an angle between -π and π without changing the orientation', () => {
    expect(wrapAngle(0)).toBe(0);
    expect(wrapAngle(Math.PI * 2 + 0.5)).toBeCloseTo(0.5);
    expect(wrapAngle(-Math.PI * 2 - 0.5)).toBeCloseTo(-0.5);
    expect(wrapAngle(Math.PI * 3)).toBeCloseTo(Math.PI);
    expect(Math.abs(wrapAngle(17.3))).toBeLessThanOrEqual(Math.PI);
  });

  it('rests on the nearest whole turn', () => {
    expect(nearestTurn(0.4)).toBe(0);
    expect(nearestTurn(Math.PI * 2 - 0.4)).toBeCloseTo(Math.PI * 2);
    expect(nearestTurn(-Math.PI * 4 + 1)).toBeCloseTo(-Math.PI * 4);
  });
});
