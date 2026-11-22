import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { Object3D } from 'three';
import type { AmbientLight, HemisphereLight, SpotLight } from 'three';
import { ROOM, damp, easeOutCubic, spotActivity } from './gallery-layout';
import type { PlacedArtwork } from './gallery-layout';
import { galleryStore, rail } from './gallery-store';
import type { GalleryState } from './gallery-store';

interface GalleryLightingProps {
  readonly placed: readonly PlacedArtwork[];
  readonly lowPower: boolean;
  readonly reducedMotion: boolean;
}

const SPOT_IDLE = 9;
const SPOT_PEAK = 78;
const SPOT_COLOUR = '#ffd9b0';
/** Seconds between the start of the travelling and the first spot switching on. */
const INTRO_DELAY = 0.7;
const INTRO_STAGGER = 0.22;
const INTRO_RAMP = 1.1;
/** How far a spot carries in the visit: well past the floor. */
const SPOT_REACH = 14;
/**
 * In focus, the spot of an object stops this far past it: the object and
 * the top of its pedestal keep their light, the floor under them loses it.
 */
const FOCUS_REACH_PAST_OBJECT = 1.05;
/** The spot of the focused work stays at its peak, a touch above. */
const FOCUS_SPOT_BOOST = 1.08;
/** What is left of the other spots while a work is in focus. */
const FOCUS_SPOT_DIM = 0.07;
/** What is left of the ambient light and of the reflections around a focused work. */
const FOCUS_AMBIENT_DIM = 0.3;
const FOCUS_ENVIRONMENT_DIM = 0.4;
const LIGHT_LAMBDA = 3.4;
const AMBIENT_LAMBDA = 2.5;
/** Damping of the lights under reduced motion: they change at once. */
const REDUCED_LAMBDA = 30;

/** Intensity of the reflection environment in the visit, by rendering budget. */
export function environmentLevel(lowPower: boolean): number {
  return lowPower ? 0.18 : 0.24;
}

/**
 * Each spot comes on in turn during the travelling, then stays at 1 once
 * the visit has started. Reduced motion skips the sequence.
 */
export function spotMaster(
  state: GalleryState,
  index: number,
  now: number,
  reducedMotion: boolean,
): number {
  if (state.phase !== 'entering' || reducedMotion) {
    return 1;
  }
  const elapsed = (now - (state.introStartedAt ?? now)) / 1000;
  return easeOutCubic(
    (elapsed - INTRO_DELAY - INTRO_STAGGER * index) / INTRO_RAMP,
  );
}

/**
 * How a work's spot answers the focus: the focused work keeps its full
 * light and every other spot drops to a glimmer. 1 outside the focus.
 */
export function spotFocusWeight(state: GalleryState, index: number): number {
  if (state.phase !== 'focus') {
    return 1;
  }
  return state.focusedIndex === index ? FOCUS_SPOT_BOOST : FOCUS_SPOT_DIM;
}

/** What is left of the light of the surroundings: 1 in the visit, low around a focused work. */
export function surroundWeight(state: GalleryState, dim: number): number {
  return state.phase === 'focus' ? dim : 1;
}

/**
 * Share of a spot's light that arrives at `distance` when the spot stops
 * at `reach`: the window three.js applies to a light with a cutoff.
 */
export function reachWindow(distance: number, reach: number): number {
  const edge = Math.min(1, Math.max(0, 1 - (distance / reach) ** 4));
  return edge * edge;
}

/**
 * How far the spot of a work carries. It shortens for a focused object, so
 * the floor around the pedestal goes dark; a painting hangs on the surface
 * its spot lights, and keeps the full reach.
 */
export function spotReach(
  state: GalleryState,
  work: PlacedArtwork,
  distance: number,
): number {
  const focused =
    state.phase === 'focus' &&
    state.focusedIndex === work.index &&
    work.kind === 'sculpture';
  return focused ? distance + FOCUS_REACH_PAST_OBJECT : SPOT_REACH;
}

interface ArtworkSpotProps {
  readonly work: PlacedArtwork;
  readonly castShadow: boolean;
  readonly reducedMotion: boolean;
}

function ArtworkSpot({ work, castShadow, reducedMotion }: ArtworkSpotProps) {
  const light = useRef<SpotLight>(null);
  const target = useMemo(() => new Object3D(), []);
  // Intensity asked of the spot, before the loss of a shortened reach is made up.
  const level = useRef(0);
  const aboveWork = work.kind === 'sculpture' ? work.z + 1.6 : work.z + 2.05;
  const position = useMemo<[number, number, number]>(
    () => [work.x + 0.15, ROOM.height - 0.25, aboveWork],
    [work.x, aboveWork],
  );
  /** From the spot to the work it lights. */
  const distance = Math.hypot(
    position[0] - work.x,
    position[1] - work.y,
    position[2] - work.z,
  );

  useEffect(() => {
    const current = light.current;
    if (!current) {
      return;
    }
    current.shadow.mapSize.set(1024, 1024);
    current.shadow.bias = -0.0005;
    current.shadow.normalBias = 0.02;
    current.shadow.camera.near = 0.5;
    current.shadow.camera.far = 9;
  }, []);

  useFrame((_, delta) => {
    const current = light.current;
    if (!current) {
      return;
    }
    const state = galleryStore.getState();
    const master = spotMaster(
      state,
      work.index,
      performance.now(),
      reducedMotion,
    );
    const activity = spotActivity(rail.current - work.x);
    const wanted =
      (SPOT_IDLE + (SPOT_PEAK - SPOT_IDLE) * activity) *
      master *
      spotFocusWeight(state, work.index);
    const lambda = reducedMotion ? REDUCED_LAMBDA : LIGHT_LAMBDA;
    const dt = Math.min(delta, 0.05);
    level.current = damp(level.current, wanted, lambda, dt);
    current.distance = damp(
      current.distance,
      spotReach(state, work, distance),
      lambda,
      dt,
    );
    // A shorter reach also dims the work itself: the spot makes up for it,
    // so only what lies beyond the work loses its light.
    current.intensity =
      (level.current * reachWindow(distance, SPOT_REACH)) /
      Math.max(reachWindow(distance, current.distance), 0.05);
  });

  return (
    <>
      <primitive object={target} position={[work.x, work.y - 0.05, work.z]} />
      <spotLight
        ref={light}
        position={position}
        target={target}
        angle={work.kind === 'sculpture' ? 0.42 : 0.5}
        penumbra={0.8}
        decay={1.6}
        distance={SPOT_REACH}
        intensity={0}
        color={SPOT_COLOUR}
        castShadow={castShadow}
      />
    </>
  );
}

/**
 * Low ambience plus one spot per work. Spot intensity follows the visitor:
 * the work in front of them is fully lit, its neighbours are dimmed, and
 * every change is damped so nothing flickers. Around a focused work the
 * room goes dark: the other spots, the ambient light and the reflections
 * drop, and come back when the visitor steps back. Only sculpture spots
 * cast shadows, which keeps the shadow pass to a handful of lights.
 */
export function GalleryLighting({
  placed,
  lowPower,
  reducedMotion,
}: GalleryLightingProps) {
  const ambient = useRef<AmbientLight>(null);
  const hemisphere = useRef<HemisphereLight>(null);
  // Share of the reflections left around a focused work, damped each frame.
  const reflections = useRef(1);
  const environment = environmentLevel(lowPower);

  useFrame((frame, delta) => {
    const state = galleryStore.getState();
    const master = spotMaster(state, 0, performance.now(), reducedMotion);
    const dt = Math.min(delta, 0.05);
    const lambda = reducedMotion ? REDUCED_LAMBDA : AMBIENT_LAMBDA;
    const surround = surroundWeight(state, FOCUS_AMBIENT_DIM);
    if (ambient.current) {
      ambient.current.intensity = damp(
        ambient.current.intensity,
        (0.05 + 0.22 * master) * surround,
        lambda,
        dt,
      );
    }
    if (hemisphere.current) {
      hemisphere.current.intensity = damp(
        hemisphere.current.intensity,
        0.28 * master * surround,
        lambda,
        dt,
      );
    }
    reflections.current = damp(
      reflections.current,
      surroundWeight(state, FOCUS_ENVIRONMENT_DIM),
      lambda,
      dt,
    );
    // The scene graph belongs to three.js: the frame loop sets its lights.
    frame.scene.environmentIntensity = environment * reflections.current;
  });

  return (
    <>
      <ambientLight ref={ambient} intensity={0.05} color="#ffe6cf" />
      <hemisphereLight
        ref={hemisphere}
        intensity={0}
        color="#5a3028"
        groundColor="#140806"
      />
      {placed.map((work) => (
        <ArtworkSpot
          key={work.id}
          work={work}
          castShadow={!lowPower && work.kind === 'sculpture'}
          reducedMotion={reducedMotion}
        />
      ))}
    </>
  );
}
