import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { MeshStandardMaterial } from 'three';
import { ROOM, damp } from './gallery-layout';
import type { SceneWork } from './scene-annex';
import { useOptionalTexture } from './use-optional-texture';

interface PaintingFrameProps {
  readonly work: SceneWork;
  readonly hovered: boolean;
}

const FRAME_WIDTH = ROOM.frameWidth;
const FRAME_DEPTH = ROOM.frameDepth;
const LIP = 0.018;
const MOULDING = 0.022;
const MOULDING_DEPTH = 0.016;

/**
 * A canvas with its gilded frame, built from boxes: the frame is real
 * geometry that catches the spots and casts a lip shadow onto the canvas.
 * Without its image file, the canvas shows a dark linen and the overlay
 * reports the missing media.
 */
export function PaintingFrame({ work, hovered }: PaintingFrameProps) {
  const texture = useOptionalTexture(work.image, { mediaId: work.id });
  const { width, height } = work;

  const gold = useMemo(
    () =>
      new MeshStandardMaterial({
        color: '#c9a46a',
        metalness: 0.62,
        roughness: 0.36,
        emissive: '#6b4a1e',
        emissiveIntensity: 0,
      }),
    [],
  );
  const moulding = useMemo(
    () =>
      new MeshStandardMaterial({
        color: '#e2c58a',
        metalness: 0.7,
        roughness: 0.28,
      }),
    [],
  );
  // The frame loop warms the gilding through this ref: render never mutates
  // the material.
  const glowRef = useRef<MeshStandardMaterial | null>(null);
  useEffect(() => {
    glowRef.current = gold;
    return () => {
      glowRef.current = null;
      gold.dispose();
      moulding.dispose();
    };
  }, [gold, moulding]);

  useFrame((_, delta) => {
    const material = glowRef.current;
    if (material === null) {
      return;
    }
    material.emissiveIntensity = damp(
      material.emissiveIntensity,
      hovered ? 0.35 : 0,
      8,
      Math.min(delta, 0.05),
    );
  });

  const outerW = width + FRAME_WIDTH * 2;
  const outerH = height + FRAME_WIDTH * 2;
  const mouldingZ = FRAME_DEPTH + MOULDING_DEPTH / 2;

  return (
    <group>
      <mesh position={[0, 0, 0.012]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial
          key={texture ? 'textured' : 'linen'}
          map={texture}
          color={texture ? '#ffffff' : '#24140f'}
          roughness={0.78}
          metalness={0}
        />
      </mesh>

      <mesh position={[0, 0, 0.005]}>
        <planeGeometry args={[width + LIP * 2, height + LIP * 2]} />
        <meshStandardMaterial color="#0d0806" roughness={1} />
      </mesh>

      <mesh
        material={gold}
        position={[0, height / 2 + FRAME_WIDTH / 2, FRAME_DEPTH / 2]}
        castShadow
      >
        <boxGeometry args={[outerW, FRAME_WIDTH, FRAME_DEPTH]} />
      </mesh>
      <mesh
        material={gold}
        position={[0, -(height / 2 + FRAME_WIDTH / 2), FRAME_DEPTH / 2]}
        castShadow
      >
        <boxGeometry args={[outerW, FRAME_WIDTH, FRAME_DEPTH]} />
      </mesh>
      <mesh
        material={gold}
        position={[-(width / 2 + FRAME_WIDTH / 2), 0, FRAME_DEPTH / 2]}
        castShadow
      >
        <boxGeometry args={[FRAME_WIDTH, outerH, FRAME_DEPTH]} />
      </mesh>
      <mesh
        material={gold}
        position={[width / 2 + FRAME_WIDTH / 2, 0, FRAME_DEPTH / 2]}
        castShadow
      >
        <boxGeometry args={[FRAME_WIDTH, outerH, FRAME_DEPTH]} />
      </mesh>

      {/* Raised inner moulding, so the frame reads as a profile and not a band. */}
      <mesh
        material={moulding}
        position={[0, height / 2 + MOULDING / 2, mouldingZ]}
      >
        <boxGeometry args={[width + MOULDING * 2, MOULDING, MOULDING_DEPTH]} />
      </mesh>
      <mesh
        material={moulding}
        position={[0, -(height / 2 + MOULDING / 2), mouldingZ]}
      >
        <boxGeometry args={[width + MOULDING * 2, MOULDING, MOULDING_DEPTH]} />
      </mesh>
      <mesh
        material={moulding}
        position={[-(width / 2 + MOULDING / 2), 0, mouldingZ]}
      >
        <boxGeometry args={[MOULDING, height, MOULDING_DEPTH]} />
      </mesh>
      <mesh
        material={moulding}
        position={[width / 2 + MOULDING / 2, 0, mouldingZ]}
      >
        <boxGeometry args={[MOULDING, height, MOULDING_DEPTH]} />
      </mesh>
    </group>
  );
}
