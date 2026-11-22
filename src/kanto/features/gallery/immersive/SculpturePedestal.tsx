import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Component, Suspense, useEffect, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import { DoubleSide, Mesh, Vector2 } from 'three';
import type { Group } from 'three';
import { FOCUS, ROOM, damp, nearestTurn, wrapAngle } from './gallery-layout';
import { footprints, galleryStore, spin } from './gallery-store';
import { fitModel } from './model-fit';
import { measureModel } from './model-measure';
import type { SceneWork } from './scene-annex';

interface SculpturePedestalProps {
  readonly work: SceneWork;
  readonly index: number;
  readonly hovered: boolean;
  readonly reducedMotion: boolean;
}

/** How closely a focused object follows the hand that turns it. */
const TURN_LAMBDA = 16;
/** How fast it comes back to rest once the visitor steps back. */
const REST_LAMBDA = 4;
const LIFT_LAMBDA = 5;
const HOVER_LAMBDA = 8;
/** Damping of every value under reduced motion: the object lands at once. */
const REDUCED_LAMBDA = 30;
/** Height the hover raises an object in the visit. */
const HOVER_LIFT = 0.02;
/** The float of a focused object: a few millimetres, one breath every five seconds. */
const BOB_HEIGHT = 0.006;
const BOB_SPEED = (Math.PI * 2) / 5;
const BOB_LAMBDA = 2;

/** Normalised jar profile (radius, height) in [0, 1], revolved around the y axis. */
const JAR_PROFILE: readonly (readonly [number, number])[] = [
  [0, 0],
  [0.42, 0],
  [0.7, 0.06],
  [0.92, 0.22],
  [1, 0.4],
  [0.94, 0.58],
  [0.72, 0.74],
  [0.52, 0.84],
  [0.5, 0.92],
  [0.6, 0.98],
  [0.64, 1],
  [0.52, 1],
  [0.44, 0.9],
  [0.4, 0.8],
];

interface ObjectProps {
  readonly width: number;
  readonly height: number;
}

/** Technical fallback when no model file is available or fails to load. */
function ProceduralPot({ width, height }: ObjectProps) {
  const profile = useMemo(
    () => JAR_PROFILE.map(([r, y]) => new Vector2((r * width) / 2, y * height)),
    [width, height],
  );
  return (
    <mesh castShadow receiveShadow>
      <latheGeometry args={[profile, 56]} />
      <meshStandardMaterial
        color="#a0603f"
        roughness={0.84}
        metalness={0}
        side={DoubleSide}
      />
    </mesh>
  );
}

interface LoadedModelProps {
  readonly src: string;
  readonly height: number;
  readonly mediaId: string;
}

/** A downloaded glTF, scaled to its display height, centred and standing on the pedestal. */
function LoadedModel({ src, height, mediaId }: LoadedModelProps) {
  const gltf = useGLTF(src, false);
  const { fit, footprint } = useMemo(() => {
    const measure = measureModel(gltf.scene);
    const fitted = fitModel(measure.bounds, height);
    return { fit: fitted, footprint: 2 * measure.radius * fitted.scale };
  }, [gltf.scene, height]);

  useEffect(() => {
    gltf.scene.traverse((object) => {
      if (object instanceof Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
    // The focus frames the object by its real width, known only now.
    if (footprint > 0) {
      footprints.set(mediaId, footprint);
    }
    galleryStore.setMediaStatus(mediaId, 'ready');
  }, [gltf.scene, mediaId, footprint]);

  return (
    <primitive
      object={gltf.scene}
      scale={fit.scale}
      position={[fit.offset[0], fit.offset[1], fit.offset[2]]}
    />
  );
}

interface BoundaryProps {
  readonly mediaId: string;
  readonly fallback: ReactNode;
  readonly children: ReactNode;
}

interface BoundaryState {
  readonly failed: boolean;
}

/** A model that fails to load leaves the procedural object in place. */
class ModelBoundary extends Component<BoundaryProps, BoundaryState> {
  override state: BoundaryState = { failed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  override componentDidCatch(): void {
    galleryStore.setMediaStatus(this.props.mediaId, 'missing');
  }

  override render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/**
 * A plaster pedestal and the object on it: the downloaded model when its
 * file is present, the procedural pot otherwise. In focus the object rises
 * a little off the pedestal, floats, and turns with the visitor's hand
 * (`spin`); nothing turns by itself. Once the visitor steps back it comes
 * down and eases to its resting orientation by the shortest way.
 */
export function SculpturePedestal({
  work,
  index,
  hovered,
  reducedMotion,
}: SculpturePedestalProps) {
  const spinGroup = useRef<Group>(null);
  const angle = useRef(0);
  const lift = useRef(0);
  const float = useRef(0);
  const clock = useRef(0);
  const wasFocused = useRef(false);

  useFrame((_, delta) => {
    const group = spinGroup.current;
    if (!group) {
      return;
    }
    const dt = Math.min(delta, 0.05);
    const state = galleryStore.getState();
    const focused = state.phase === 'focus' && state.focusedIndex === index;

    if (focused) {
      if (!wasFocused.current) {
        // Same orientation, counted from the nearest rest: no unwinding.
        angle.current = wrapAngle(angle.current);
      }
      angle.current = damp(
        angle.current,
        spin.yaw,
        reducedMotion ? REDUCED_LAMBDA : TURN_LAMBDA,
        dt,
      );
    } else if (angle.current !== 0) {
      const rest = nearestTurn(angle.current);
      angle.current = damp(
        angle.current,
        rest,
        reducedMotion ? REDUCED_LAMBDA : REST_LAMBDA,
        dt,
      );
      if (Math.abs(angle.current - rest) < 0.0005) {
        angle.current = 0;
      }
    }
    wasFocused.current = focused;

    const height = focused ? FOCUS.lift : hovered ? HOVER_LIFT : 0;
    lift.current = damp(
      lift.current,
      height,
      reducedMotion ? REDUCED_LAMBDA : focused ? LIFT_LAMBDA : HOVER_LAMBDA,
      dt,
    );
    // The float fades in and out with the focus; reduced motion has none.
    float.current = damp(
      float.current,
      focused && !reducedMotion ? 1 : 0,
      reducedMotion ? REDUCED_LAMBDA : BOB_LAMBDA,
      dt,
    );
    clock.current += dt;
    const bob =
      float.current < 0.001
        ? 0
        : float.current * Math.sin(clock.current * BOB_SPEED) * BOB_HEIGHT;

    group.rotation.y = angle.current;
    group.position.y = ROOM.pedestalHeight + lift.current + bob;
  });

  const size = ROOM.pedestalSize;
  const fallback = <ProceduralPot width={work.width} height={work.height} />;

  return (
    <group>
      <mesh position={[0, ROOM.pedestalHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[size, ROOM.pedestalHeight, size]} />
        <meshStandardMaterial color="#e6e0d4" roughness={0.9} metalness={0} />
      </mesh>
      <mesh position={[0, ROOM.pedestalHeight + 0.004, 0]} receiveShadow>
        <boxGeometry args={[size + 0.02, 0.008, size + 0.02]} />
        <meshStandardMaterial color="#d9d2c4" roughness={0.85} />
      </mesh>
      <group ref={spinGroup} position={[0, ROOM.pedestalHeight, 0]}>
        {work.model ? (
          <ModelBoundary mediaId={work.id} fallback={fallback}>
            <Suspense fallback={fallback}>
              <LoadedModel
                src={work.model.model1k}
                height={work.height}
                mediaId={work.id}
              />
            </Suspense>
          </ModelBoundary>
        ) : (
          fallback
        )}
      </group>
    </group>
  );
}
