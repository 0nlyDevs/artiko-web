import type { Artwork, ArtworkModel, Room, RoomSlug } from '../data/rooms';
import { rooms } from '../data/rooms';

/*
 * What the 3D room needs to know about the works, derived from the single
 * content source in data/rooms.ts: a stable id, the room, the kind of
 * object, its physical size in metres, the image of a painting or the
 * model of a sculpture.
 */

export type SceneKind = 'painting' | 'sculpture';

export interface SceneWork {
  readonly id: string;
  readonly roomSlug: RoomSlug;
  readonly roomIndex: number;
  readonly artworkIndex: number;
  readonly kind: SceneKind;
  /** Physical size in metres: the canvas, or the object on its pedestal. */
  readonly width: number;
  readonly height: number;
  /** Largest image file of a painting, served from public/media/. */
  readonly image: string | null;
  readonly model: ArtworkModel | null;
}

/** Hung height of a painting whose dimensions are not recorded. */
const DEFAULT_PAINTING_HEIGHT = 0.9;
const MIN_PAINTING_WIDTH = 0.45;
const MAX_PAINTING_WIDTH = 1.5;
const DIMENSIONS = /(\d+(?:[.,]\d+)?)\s*[×x]\s*(\d+(?:[.,]\d+)?)\s*cm/i;

function toMetres(centimetres: string): number {
  return Number(centimetres.replace(',', '.')) / 100;
}

/** Reads "106,8 × 71,1 cm" (height × width) into metres. */
export function parseDimensions(
  text: string,
): { height: number; width: number } | null {
  const match = DIMENSIONS.exec(text);
  if (match === null) {
    return null;
  }
  const height = toMetres(match[1] ?? '');
  const width = toMetres(match[2] ?? '');
  if (!(height > 0) || !(width > 0)) {
    return null;
  }
  return { height, width };
}

export function paintingSize(artwork: Artwork): {
  width: number;
  height: number;
} {
  const parsed = parseDimensions(artwork.dimensions);
  if (parsed !== null) {
    return parsed;
  }
  const aspect =
    artwork.image.height > 0 ? artwork.image.width / artwork.image.height : 1;
  return {
    height: DEFAULT_PAINTING_HEIGHT,
    width: Math.min(
      MAX_PAINTING_WIDTH,
      Math.max(MIN_PAINTING_WIDTH, DEFAULT_PAINTING_HEIGHT * aspect),
    ),
  };
}

/** The works of every room that has some, in visiting order. */
export function sceneWorks(source: readonly Room[] = rooms): SceneWork[] {
  const works: SceneWork[] = [];
  source.forEach((room, roomIndex) => {
    room.artworks.forEach((artwork, artworkIndex) => {
      const model = artwork.model ?? null;
      const kind: SceneKind =
        room.medium === 'sculpture' && model !== null
          ? 'sculpture'
          : 'painting';
      const size =
        kind === 'sculpture' && model !== null
          ? { height: model.displayHeight, width: model.displayHeight * 0.8 }
          : paintingSize(artwork);
      works.push({
        id: `${room.slug}/${artwork.number}`,
        roomSlug: room.slug,
        roomIndex,
        artworkIndex,
        kind,
        width: size.width,
        height: size.height,
        image: kind === 'painting' ? artwork.image.src : null,
        model,
      });
    });
  });
  return works;
}

/** Scene position of a route, falling back to the room's first work. */
export function sceneIndexOf(
  works: readonly SceneWork[],
  roomSlug: string,
  artworkIndex: number | null,
): number {
  const exact = works.findIndex(
    (work) =>
      work.roomSlug === roomSlug && work.artworkIndex === (artworkIndex ?? 0),
  );
  if (exact >= 0) {
    return exact;
  }
  const first = works.findIndex((work) => work.roomSlug === roomSlug);
  return first >= 0 ? first : 0;
}
