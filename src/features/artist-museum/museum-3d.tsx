"use client";

import { OrbitControls, Resize, useGLTF, useTexture } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, type ReactNode } from "react";
import type { Museum, MuseumSlot, Work } from "@/lib/api";
import { DRACO_DECODER_PATH } from "@/lib/draco";
import { SlotErrorBoundary } from "./slot-error-boundary";

// drei 10.7.9 fetches the Draco decoder from www.gstatic.com unless told otherwise (core/Gltf.js:8).
useGLTF.setDecoderPath(DRACO_DECODER_PATH);

type Props = { museum: Museum; selectedId: string; onSelect: (work: Work) => void };

const WALL = "#FBF0E4";
const FLOOR = "#4a4a4a";
const ACCENT = "#C8553D";
const INK = "#111111";
const PENDING = "#9a9a9a";
const FRAME_HEIGHT = 1.2;

/** One room laid out by the API (same data as the Android app), entrance at +z. */
export default function Museum3D({ museum, selectedId, onSelect }: Props) {
  const { width, depth, height } = museum.room;
  return (
    <Canvas camera={{ position: [0, 1.6, depth / 2 - 0.5], fov: 60 }} dpr={[1, 2]}>
      <ambientLight intensity={1.4} />
      <pointLight position={[0, height - 0.3, 0]} intensity={20} />
      <mesh rotation-x={-Math.PI / 2}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color={FLOOR} />
      </mesh>
      {/* back, left, right walls; the entrance side stays open */}
      <mesh position={[0, height / 2, -depth / 2]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color={WALL} />
      </mesh>
      <mesh position={[-width / 2, height / 2, 0]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[depth, height]} />
        <meshStandardMaterial color={WALL} />
      </mesh>
      <mesh position={[width / 2, height / 2, 0]} rotation-y={-Math.PI / 2}>
        <planeGeometry args={[depth, height]} />
        <meshStandardMaterial color={WALL} />
      </mesh>
      {museum.slots.map((slot) => (
        <SlotErrorBoundary key={slot.work.id}>
          <Suspense fallback={<SlotPlaceholder slot={slot} selected={slot.work.id === selectedId} onSelect={onSelect} />}>
            {slot.kind === "wall" ? (
              <Frame slot={slot} selected={slot.work.id === selectedId} onSelect={onSelect} />
            ) : (
              <Plinth slot={slot} selected={slot.work.id === selectedId} onSelect={onSelect} />
            )}
          </Suspense>
        </SlotErrorBoundary>
      ))}
      <OrbitControls
        target={[0, 1.4, 0]}
        maxPolarAngle={Math.PI / 2 - 0.05}
        minDistance={1}
        maxDistance={depth / 2}
        enablePan={false}
      />
    </Canvas>
  );
}

type SlotProps = { slot: MuseumSlot; selected: boolean; onSelect: (work: Work) => void };

function Frame({ slot, selected, onSelect }: SlotProps) {
  const [x, y, z] = slot.position;
  return (
    <group position={[x, y, z]} rotation-y={slot.rotation_y}>
      {slot.work.media_kind === "image" ? (
        <Picture slot={slot} selected={selected} onSelect={onSelect} />
      ) : (
        <mesh onClick={() => onSelect(slot.work)}>
          <planeGeometry args={[FRAME_HEIGHT * 1.6, FRAME_HEIGHT]} />
          <meshStandardMaterial color={selected ? ACCENT : INK} />
        </mesh>
      )}
    </group>
  );
}

function Picture({ slot, selected, onSelect }: SlotProps) {
  const texture = useTexture(slot.work.media_url);
  const image = texture.image as { width: number; height: number };
  const w = Math.min(FRAME_HEIGHT * (image.width / image.height), 2.4);
  return (
    <>
      {/* the frame: an accent border when the work is open in the side panel */}
      <mesh position-z={-0.01}>
        <planeGeometry args={[w + 0.12, FRAME_HEIGHT + 0.12]} />
        <meshStandardMaterial color={selected ? ACCENT : INK} />
      </mesh>
      <mesh onClick={() => onSelect(slot.work)}>
        <planeGeometry args={[w, FRAME_HEIGHT]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
    </>
  );
}

/** Stands in for a work while its image or model downloads, so the room never shows an empty spot. */
function SlotPlaceholder({ slot, selected, onSelect }: SlotProps) {
  const [x, y, z] = slot.position;
  if (slot.kind === "wall") {
    return (
      <mesh position={[x, y, z]} rotation-y={slot.rotation_y} onClick={() => onSelect(slot.work)}>
        <planeGeometry args={[FRAME_HEIGHT * 1.6, FRAME_HEIGHT]} />
        <meshStandardMaterial color={selected ? ACCENT : PENDING} />
      </mesh>
    );
  }
  return (
    <PlinthBase slot={slot} selected={selected} onSelect={onSelect}>
      <mesh>
        <icosahedronGeometry args={[0.2, 0]} />
        <meshStandardMaterial color={PENDING} wireframe />
      </mesh>
    </PlinthBase>
  );
}

function Plinth({ slot, selected, onSelect }: SlotProps) {
  return (
    <PlinthBase slot={slot} selected={selected} onSelect={onSelect}>
      {slot.work.media_kind === "model" ? (
        <Model url={slot.work.media_url} />
      ) : (
        <mesh>
          <sphereGeometry args={[0.2, 32, 16]} />
          <meshStandardMaterial color={ACCENT} />
        </mesh>
      )}
    </PlinthBase>
  );
}

function PlinthBase({ slot, selected, onSelect, children }: SlotProps & { children: ReactNode }) {
  const [x, y, z] = slot.position;
  return (
    <group position={[x, 0, z]} onClick={() => onSelect(slot.work)}>
      <mesh position-y={y / 2}>
        <boxGeometry args={[0.7, y, 0.7]} />
        <meshStandardMaterial color={selected ? ACCENT : WALL} />
      </mesh>
      <group position-y={y + 0.3}>{children}</group>
    </group>
  );
}

function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return (
    <Resize scale={0.6}>
      <primitive object={scene.clone()} />
    </Resize>
  );
}
