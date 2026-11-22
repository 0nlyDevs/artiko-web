import type { Room } from '../data/rooms';
import { rooms } from '../data/rooms';
import { ROOM, wallSegments } from './gallery-layout';
import type { PlacedArtwork } from './gallery-layout';
import { useOptionalTexture } from './use-optional-texture';

interface MuseumRoomProps {
  /** Length of the room along x, in metres. The room starts at x = 0. */
  readonly length: number;
  readonly placed: readonly PlacedArtwork[];
}

/** Wall colours per room tone, from the FE-02 room ambience. */
const WALL_TONES: Record<Room['ambience']['wallTone'], string> = {
  red: '#5a1f17',
  stone: '#2e3d43',
  ochre: '#6a4320',
  indigo: '#23284a',
};
const WINE_DEEP = '#3f1510';
const WOOD_DARK = '#1e120c';

function wallColour(roomSlug: string): string {
  const room = rooms.find((candidate) => candidate.slug === roomSlug);
  return room ? WALL_TONES[room.ambience.wallTone] : WALL_TONES.red;
}

/**
 * The architecture: a long room built from planes, a parquet floor and
 * dark mouldings. The back wall changes colour from room to room, with a
 * pilaster at each boundary, so the visit reads as a sequence of rooms.
 */
export function MuseumRoom({ length, placed }: MuseumRoomProps) {
  const centreX = length / 2;
  const parquet = useOptionalTexture('/media/textures/parquet.jpg', {
    repeat: [length / 2.4, ROOM.depth / 2.4],
  });
  const segments = wallSegments(placed);
  const firstColour = wallColour(segments[0]?.room ?? 'peinture');
  const lastColour = wallColour(
    segments[segments.length - 1]?.room ?? 'peinture',
  );

  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[centreX, 0, ROOM.depth / 2]}
        receiveShadow
      >
        <planeGeometry args={[length, ROOM.depth]} />
        <meshStandardMaterial
          key={parquet ? 'parquet' : 'plain'}
          color={parquet ? '#d8c8b4' : '#3a2417'}
          map={parquet}
          roughness={0.5}
          metalness={0.04}
        />
      </mesh>

      {segments.map((segment) => (
        <mesh
          key={`${segment.room}-${String(segment.start)}`}
          position={[
            (segment.start + segment.end) / 2,
            ROOM.height / 2,
            ROOM.wallZ - 0.01,
          ]}
          receiveShadow
        >
          <planeGeometry args={[segment.end - segment.start, ROOM.height]} />
          <meshPhysicalMaterial
            color={wallColour(segment.room)}
            roughness={0.92}
            sheen={0.6}
            sheenRoughness={0.7}
            sheenColor="#8f3b2d"
          />
        </mesh>
      ))}

      {segments.slice(1).map((segment) => (
        <mesh
          key={`pilaster-${segment.room}`}
          position={[segment.start, ROOM.height / 2, ROOM.wallZ + 0.08]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[0.28, ROOM.height, 0.18]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.7} />
        </mesh>
      ))}

      <mesh
        rotation={[Math.PI / 2, 0, 0]}
        position={[centreX, ROOM.height, ROOM.depth / 2]}
      >
        <planeGeometry args={[length, ROOM.depth]} />
        <meshStandardMaterial color="#110706" roughness={1} />
      </mesh>

      <mesh
        rotation={[0, Math.PI, 0]}
        position={[centreX, ROOM.height / 2, ROOM.depth]}
      >
        <planeGeometry args={[length, ROOM.height]} />
        <meshStandardMaterial color={WINE_DEEP} roughness={0.95} />
      </mesh>

      <mesh
        rotation={[0, Math.PI / 2, 0]}
        position={[0, ROOM.height / 2, ROOM.depth / 2]}
      >
        <planeGeometry args={[ROOM.depth, ROOM.height]} />
        <meshStandardMaterial color={firstColour} roughness={0.95} />
      </mesh>

      <mesh
        rotation={[0, -Math.PI / 2, 0]}
        position={[length, ROOM.height / 2, ROOM.depth / 2]}
      >
        <planeGeometry args={[ROOM.depth, ROOM.height]} />
        <meshStandardMaterial color={lastColour} roughness={0.95} />
      </mesh>

      <mesh position={[centreX, ROOM.baseboardHeight / 2, ROOM.wallZ + 0.03]}>
        <boxGeometry args={[length, ROOM.baseboardHeight, 0.06]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.55} />
      </mesh>

      <mesh position={[centreX, ROOM.height - 0.09, ROOM.wallZ + 0.06]}>
        <boxGeometry args={[length, 0.18, 0.12]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.7} />
      </mesh>
    </group>
  );
}
