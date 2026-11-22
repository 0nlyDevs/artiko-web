import { PerformanceMonitor } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { Component, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { PCFShadowMap, PMREMGenerator, WebGLRenderer } from 'three';
import type { Scene, Texture } from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Artwork } from './Artwork';
import { FocusFraming } from './FocusFraming';
import { GalleryCamera } from './GalleryCamera';
import { GalleryControls } from './GalleryControls';
import { GalleryLighting, environmentLevel } from './GalleryLighting';
import { LabelProjector } from './LabelProjector';
import { MuseumRoom } from './MuseumRoom';
import { CAMERA_FOV, ROOM, roomLength } from './gallery-layout';
import type { PlacedArtwork } from './gallery-layout';
import { galleryStore, input } from './gallery-store';
import type { SceneWork } from './scene-annex';
import { quietClockDeprecation } from './three-console';

const BACKDROP = '#070403';

// Before the canvas below creates its clock.
quietClockDeprecation();

interface GallerySceneProps {
  readonly works: readonly SceneWork[];
  readonly placed: readonly PlacedArtwork[];
  readonly lowPower: boolean;
  readonly reducedMotion: boolean;
  /** Called when WebGL fails after mount, so the page can fall back. */
  readonly onFailure: () => void;
}

interface ProceduralEnvironmentProps {
  readonly intensity: number;
}

/**
 * Writes the reflection environment of a scene. The scene graph belongs to
 * three.js and is mutable by design: the component decides when the
 * environment applies and this function sets it.
 */
function setEnvironment(
  scene: Scene,
  environment: Texture | null,
  intensity = scene.environmentIntensity,
): void {
  scene.environment = environment;
  scene.environmentIntensity = intensity;
}

/**
 * A procedural studio environment, generated on the GPU at start, gives the
 * gilded frames something to reflect without downloading an HDR file.
 */
function ProceduralEnvironment({ intensity }: ProceduralEnvironmentProps) {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);

  useEffect(() => {
    if (!(gl instanceof WebGLRenderer)) {
      return undefined;
    }
    const generator = new PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const environment = generator.fromScene(room, 0.04).texture;
    room.dispose();
    generator.dispose();
    setEnvironment(scene, environment, intensity);
    return () => {
      setEnvironment(scene, null);
      environment.dispose();
    };
  }, [gl, scene, intensity]);

  return null;
}

interface BoundaryProps {
  readonly onError: () => void;
  readonly children: ReactNode;
}

interface BoundaryState {
  readonly failed: boolean;
}

class SceneErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  override state: BoundaryState = { failed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  override componentDidCatch(): void {
    this.props.onError();
  }

  override render(): ReactNode {
    return this.state.failed ? null : this.props.children;
  }
}

/**
 * A click on the bare wall or floor steps back from a focused work. The
 * scene only reports a pointer that did not travel, so the drag that turns
 * an object never ends the focus.
 */
function leaveFocusOnMiss(): void {
  if (!input.locked) {
    galleryStore.unfocus();
  }
}

/** The WebGL layer. Text and controls live in the DOM above it. */
export function GalleryScene({
  works,
  placed,
  lowPower,
  reducedMotion,
  onFailure,
}: GallerySceneProps) {
  const maxDpr = lowPower ? 1 : 1.5;
  const [dpr, setDpr] = useState(maxDpr);
  const length = roomLength(placed);
  const first = placed[0];

  return (
    <SceneErrorBoundary onError={onFailure}>
      <Canvas
        dpr={dpr}
        shadows={lowPower ? false : { enabled: true, type: PCFShadowMap }}
        gl={{
          antialias: !lowPower,
          powerPreference: 'high-performance',
          alpha: false,
          stencil: false,
        }}
        camera={{
          fov: CAMERA_FOV,
          near: 0.05,
          far: 60,
          position: [first?.x ?? 0, 2, ROOM.depth - 0.4],
        }}
        onCreated={({ gl }) => {
          gl.setClearColor(BACKDROP);
        }}
        onPointerMissed={leaveFocusOnMiss}
      >
        <color attach="background" args={[BACKDROP]} />
        <fog attach="fog" args={[BACKDROP, 10, 30]} />
        <PerformanceMonitor
          onDecline={() => {
            setDpr(1);
          }}
          onIncline={() => {
            setDpr(maxDpr);
          }}
        />
        <ProceduralEnvironment intensity={environmentLevel(lowPower)} />
        <MuseumRoom length={length} placed={placed} />
        <GalleryLighting
          placed={placed}
          lowPower={lowPower}
          reducedMotion={reducedMotion}
        />
        {placed.map((item) => {
          const work = works[item.index];
          return work ? (
            <Artwork
              key={item.id}
              work={work}
              placed={item}
              reducedMotion={reducedMotion}
            />
          ) : null;
        })}
        <GalleryCamera placed={placed} reducedMotion={reducedMotion} />
        <GalleryControls placed={placed} />
        <LabelProjector placed={placed} />
        <FocusFraming placed={placed} />
      </Canvas>
    </SceneErrorBoundary>
  );
}
