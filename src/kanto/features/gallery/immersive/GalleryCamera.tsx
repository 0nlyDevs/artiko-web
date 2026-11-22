import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { Vector3 } from 'three';
import {
  FOCUS,
  ROOM,
  clamp,
  damp,
  focusPose,
  introPose,
  nearestIndex,
  noticePose,
  orbitPose,
  visitPose,
} from './gallery-layout';
import type { CameraPose, PlacedArtwork } from './gallery-layout';
import {
  advanceSpin,
  footprints,
  galleryStore,
  lens,
  rail,
  railTo,
  spin,
  subjectIndex,
} from './gallery-store';

interface GalleryCameraProps {
  readonly placed: readonly PlacedArtwork[];
  readonly reducedMotion: boolean;
}

export const INTRO_SECONDS = 3.4;
/** A frame longer than this (shader compilation, a tab switch) counts for this much of the intro. */
const INTRO_MAX_STEP = 0.1;
/** Damping of every pose under reduced motion: the camera lands at once. */
const REDUCED_LAMBDA = 30;
/** How closely the camera follows a vertical drag on a focused object. */
const TILT_LAMBDA = 12;
/** The camera stays this far above the base of a floating object. */
const UNDERSIDE_MARGIN = 0.04;

/**
 * The guided camera. There is no free camera: every phase resolves to one
 * pose, and the camera is damped towards it each frame. In the visit the
 * visitor drives the rail, which the visit pose follows. In the focus the
 * camera frames the work; wheel and pinch dolly it, and a vertical drag on
 * a 3D work raises it on an arc. With the notice open it steps aside, so
 * the work stays clear of the panel.
 */
export function GalleryCamera({ placed, reducedMotion }: GalleryCameraProps) {
  const camera = useThree((state) => state.camera);
  const position = useRef(new Vector3());
  const target = useRef(new Vector3());
  const started = useRef(false);
  // Rendered time of the entrance, so a frozen first frame does not swallow it.
  const introElapsed = useRef(0);
  // Height of the camera on its arc around a focused object, in radians.
  const tilt = useRef(0);

  useEffect(
    () =>
      galleryStore.subscribe(() => {
        const state = galleryStore.getState();
        if (state.phase === 'focus' && state.focusedIndex !== null) {
          const work = placed[state.focusedIndex];
          if (work) {
            railTo(work.x);
          }
        }
      }),
    [placed],
  );

  useFrame((frame, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const state = galleryStore.getState();

    rail.current = damp(
      rail.current,
      rail.target,
      reducedMotion ? REDUCED_LAMBDA : 4.5,
      dt,
    );
    if (Math.abs(rail.current - rail.target) < 0.0005) {
      rail.current = rail.target;
    }
    if (state.phase === 'visiting') {
      const nearest = nearestIndex(placed, rail.target);
      if (nearest !== state.activeIndex) {
        galleryStore.setActive(nearest);
      }
    }
    advanceSpin(dt, reducedMotion);

    const subject = placed[subjectIndex(state)];
    const turning =
      state.phase === 'focus' &&
      !state.noticeOpen &&
      subject?.kind === 'sculpture';

    let pose: CameraPose;
    let lambda: number;
    if (state.phase === 'entering') {
      if (state.introStartedAt !== null) {
        introElapsed.current += Math.min(rawDelta, INTRO_MAX_STEP);
      }
      const progress = reducedMotion
        ? 1
        : clamp(introElapsed.current / INTRO_SECONDS, 0, 1);
      pose = introPose(progress, rail.current);
      lambda = 14;
      if (progress >= 1) {
        galleryStore.introDone();
      }
    } else if (state.noticeOpen && subject) {
      pose = noticePose(subject);
      lambda = 3.4;
    } else if (state.phase === 'focus' && subject) {
      pose = focusPose(subject, frame.size.width / frame.size.height, {
        dolly: lens.dolly,
        footprint: footprints.get(subject.id),
      });
      lambda = 3.6;
    } else {
      pose = visitPose(rail.current);
      lambda = 5;
    }

    const k = reducedMotion ? REDUCED_LAMBDA : lambda;
    const p = position.current;
    const t = target.current;
    if (!started.current) {
      p.set(pose.position[0], pose.position[1], pose.position[2]);
      t.set(pose.target[0], pose.target[1], pose.target[2]);
      started.current = true;
    } else {
      p.set(
        damp(p.x, pose.position[0], k, dt),
        damp(p.y, pose.position[1], k, dt),
        damp(p.z, pose.position[2], k, dt),
      );
      t.set(
        damp(t.x, pose.target[0], k, dt),
        damp(t.y, pose.target[1], k, dt),
        damp(t.z, pose.target[2], k, dt),
      );
    }

    // The vertical drag is applied after the damping, so it follows the hand.
    tilt.current = damp(
      tilt.current,
      turning ? spin.pitch : 0,
      reducedMotion ? REDUCED_LAMBDA : TILT_LAMBDA,
      dt,
    );
    if (Math.abs(tilt.current) < 0.0005 && !turning) {
      tilt.current = 0;
    }
    if (tilt.current === 0) {
      camera.position.copy(p);
    } else {
      const raised = orbitPose(
        { position: [p.x, p.y, p.z], target: [t.x, t.y, t.z] },
        tilt.current,
        ROOM.pedestalHeight + FOCUS.lift + UNDERSIDE_MARGIN,
      );
      camera.position.set(
        raised.position[0],
        raised.position[1],
        raised.position[2],
      );
    }
    camera.lookAt(t);
  });

  return null;
}
