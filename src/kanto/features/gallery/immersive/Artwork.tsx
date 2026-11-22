import { useCursor } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import { PaintingFrame } from './PaintingFrame';
import { SculpturePedestal } from './SculpturePedestal';
import type { PlacedArtwork } from './gallery-layout';
import { galleryStore, input, useGallery } from './gallery-store';
import type { SceneWork } from './scene-annex';

interface ArtworkProps {
  readonly work: SceneWork;
  readonly placed: PlacedArtwork;
  readonly reducedMotion: boolean;
}

/** A click that travelled more than this many pixels was a drag. */
const CLICK_TOLERANCE = 6;

/**
 * One work in the room: the 3D object and its pointer behaviour. Hover
 * highlights it in the visit, and a clean click (not the end of a drag)
 * brings the visitor close to it. The notice is not opened here: it has
 * its own button, on the wall label and in the caption of the focus.
 */
export function Artwork({ work, placed, reducedMotion }: ArtworkProps) {
  const { phase, hoveredIndex } = useGallery();
  const hovered = hoveredIndex === placed.index;
  useCursor(hovered && phase === 'visiting');

  const handleOver = (event: ThreeEvent<PointerEvent>): void => {
    event.stopPropagation();
    if (!input.locked && galleryStore.getState().phase === 'visiting') {
      galleryStore.setHovered(placed.index);
    }
  };

  const handleOut = (): void => {
    if (galleryStore.getState().hoveredIndex === placed.index) {
      galleryStore.setHovered(null);
    }
  };

  const handleClick = (event: ThreeEvent<MouseEvent>): void => {
    event.stopPropagation();
    if (event.delta > CLICK_TOLERANCE || input.locked) {
      return;
    }
    // From the visit, or from another work already in focus.
    galleryStore.focus(placed.index);
  };

  return (
    <group
      position={[
        placed.x,
        placed.kind === 'sculpture' ? 0 : placed.y,
        placed.z,
      ]}
      onPointerOver={handleOver}
      onPointerOut={handleOut}
      onClick={handleClick}
    >
      {placed.kind === 'sculpture' ? (
        <SculpturePedestal
          work={work}
          index={placed.index}
          hovered={hovered}
          reducedMotion={reducedMotion}
        />
      ) : (
        <PaintingFrame work={work} hovered={hovered} />
      )}
    </group>
  );
}
