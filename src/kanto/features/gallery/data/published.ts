import type { PublishedWork } from '../../../lib/museum-data/published-works';
import type { Artwork, Room, RoomSlug } from './rooms';
import { rooms } from './rooms';

/** The room of each category of the API; categories without a room of their own hang in the first one. */
const ROOM_OF_CATEGORY: Record<string, RoomSlug> = {
  painting: 'peinture',
  photography: 'peinture',
  digital: 'peinture',
  sculpture: 'sculpture',
  crafts: 'savoir-faire',
  music: 'musique',
  dance: 'peinture',
  oral_arts: 'peinture',
};

/** Pictures of the API carry no size: a portrait format hangs well in every room. */
const DEFAULT_SIZE = { width: 1200, height: 1500 };

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** Height of a published 3D work on its pedestal, in metres: the API does not give its size. */
const MODEL_DISPLAY_HEIGHT = 0.45;

export function toArtwork(work: PublishedWork, number: number): Artwork {
  const isModel = work.mediaKind === 'model';
  // A 3D work shows its poster wherever a picture is needed (cartel, plan, fallback without WebGL).
  const picture = isModel ? (work.posterUrl ?? '') : work.mediaUrl;
  return {
    number: pad(number),
    title: work.title,
    artist: work.artistName,
    year: '',
    technique: '',
    dimensions: '',
    region: '',
    provenance: '',
    story: work.story === '' ? [] : [work.story],
    rights: '',
    image: {
      src: picture,
      srcSet: picture === '' ? '' : `${picture} ${String(DEFAULT_SIZE.width)}w`,
      width: DEFAULT_SIZE.width,
      height: DEFAULT_SIZE.height,
    },
    alt: `${work.title}, ${work.artistName}`,
    isDemo: false,
    verification: 'unreviewed',
    ...(isModel
      ? {
          model: {
            model1k: work.mediaUrl,
            ...(work.modelHdUrl === null ? {} : { model2k: work.modelHdUrl }),
            poster: picture,
            bottomScanned: false,
            displayHeight: MODEL_DISPLAY_HEIGHT,
          },
        }
      : {}),
  };
}

let installed = false;

/**
 * Hangs the published works in the rooms. A room that receives works shows
 * them alone, numbered from 01; a room without any keeps what it had. Runs
 * once, before the museum's modules read the rooms.
 */
export function installPublishedWorks(
  works: readonly PublishedWork[],
  target: readonly Room[] = rooms,
): void {
  if (installed && target === rooms) {
    return;
  }
  if (target === rooms) {
    installed = true;
  }
  const byRoom = new Map<RoomSlug, PublishedWork[]>();
  for (const work of works) {
    // Every 3D work stands on a pedestal: the sculpture room is the room of objects.
    const slug =
      work.mediaKind === 'model'
        ? 'sculpture'
        : (ROOM_OF_CATEGORY[work.category] ?? 'peinture');
    byRoom.set(slug, [...(byRoom.get(slug) ?? []), work]);
  }
  for (const room of target) {
    const hung = byRoom.get(room.slug);
    if (hung === undefined || hung.length === 0) {
      continue;
    }
    // The room list is the content registry of the museum: it is filled once, here.
    (room as { artworks: readonly Artwork[] }).artworks = hung.map((work, index) =>
      toArtwork(work, index + 1),
    );
  }
}
