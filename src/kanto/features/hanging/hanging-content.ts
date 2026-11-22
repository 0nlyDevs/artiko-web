import { paths } from '../../app/routes';
import {
  MEDIUM_LABEL,
  primaryImage,
  readyImages,
} from '../../components/item-meta/item-meta';
import type { Item } from '../../lib/api/types';
import type { Room, RoomAmbience } from '../gallery/data/rooms';
import {
  artworkPath,
  findRoom,
  roomPath,
  rooms,
} from '../gallery/data/rooms';

/*
 * What the hanging ceremony says and shows, as pure functions of the item.
 * The copy follows the real status of the work: a sent work waits for a
 * human review and is not in its room yet, so only a published one is said
 * to be hung.
 */

/** The two moments that get a ceremony. Any other status has none. */
export type HangingStatus = 'published' | 'pending';

/** What waits for the work in the room, empty and lit, before it arrives. */
export type HangingStand = 'plinth' | 'rail' | 'label';

export interface HangingAction {
  label: string;
  to: string;
}

export interface HangingCopy {
  status: HangingStatus;
  eyebrow: string;
  /** First headline line, in Malagasy: the markup marks its language. */
  thanks: string;
  /** The two French headline lines under it. */
  lines: readonly [string, string];
  paragraph: string;
  primary: HangingAction;
  secondary: HangingAction;
  /** A quiet third way out, shown as a text link. */
  tertiary: HangingAction;
}

/** The room of the ceremony: its name for the copy and its walls for the decor. */
export interface HangingRoom {
  name: string;
  number: string;
  wallTone: RoomAmbience['wallTone'];
  usesRedRoomScene: boolean;
  /** Where "Voir dans la salle" leads: the work itself when the room hangs it. */
  path: string;
}

export interface HangingSources {
  /** The 1K model of a scanned work, or null when it has none. */
  model: string | null;
  /** Still images to try in turn: the poster of the model first, then the photographs. */
  images: readonly string[];
}

export interface HangingCartel {
  number: string;
  title: string;
  author: string;
  medium: string;
  /** Says where the work stands when it is not hung yet. */
  note: string | null;
  isDemo: boolean;
}

export function hangingStatus(
  item: Pick<Item, 'publication' | 'review'>,
): HangingStatus | null {
  if (item.publication === 'published') {
    return 'published';
  }
  return item.review.state === 'pending' ? 'pending' : null;
}

function museumRoom(item: Pick<Item, 'medium' | 'room'>): Room | undefined {
  const hung = item.room === null ? undefined : findRoom(item.room.slug);
  return hung ?? rooms.find((room) => room.medium === item.medium);
}

/** Path of the work in its room when the room hangs it, of the room otherwise. */
function placePath(item: Pick<Item, 'id' | 'room'>, room: Room): string {
  const place = item.room;
  const artwork =
    room.artworks.find((candidate) => candidate.itemId === item.id) ??
    (place !== null && place.slug === room.slug
      ? room.artworks.find((candidate) => candidate.number === place.number)
      : undefined);
  return artwork === undefined ? roomPath(room) : artworkPath(room, artwork);
}

/** The room matching the medium of the item, or the room that already hangs it. */
export function hangingRoom(
  item: Pick<Item, 'id' | 'medium' | 'room'>,
): HangingRoom {
  const room = museumRoom(item);
  if (room === undefined) {
    return {
      name: MEDIUM_LABEL[item.medium],
      number: '',
      wallTone: 'stone',
      usesRedRoomScene: false,
      path: paths.museum(),
    };
  }
  return {
    name: room.name,
    number: room.number,
    wallTone: room.ambience.wallTone,
    usesRedRoomScene: room.ambience.usesRedRoomScene,
    path: placePath(item, room),
  };
}

const THANKS = 'Misaotra !';
const ANOTHER: HangingAction = {
  label: 'Déposer une autre œuvre',
  to: paths.wizardNew,
};

/** The copy of the ceremony, or null when the status of the item has none. */
export function hangingCopy(
  item: Pick<Item, 'id' | 'medium' | 'room' | 'publication' | 'review'>,
): HangingCopy | null {
  const status = hangingStatus(item);
  if (status === null) {
    return null;
  }
  const room = hangingRoom(item);
  if (status === 'published') {
    return {
      status,
      eyebrow: 'Œuvre publiée',
      thanks: THANKS,
      lines: ['Votre œuvre est', 'accrochée.'],
      paragraph: `Elle est visible dès maintenant dans la salle ${room.name}.`,
      primary: { label: 'Voir dans la salle', to: room.path },
      secondary: ANOTHER,
      tertiary: { label: 'Retour à mon espace', to: paths.space },
    };
  }
  return {
    status,
    eyebrow: 'Dépôt reçu',
    thanks: THANKS,
    lines: ['Votre œuvre est', 'déposée.'],
    paragraph: `Elle sera accrochée dans la salle ${room.name} dès qu’un relecteur l’aura validée. Suivez son parcours depuis votre espace.`,
    primary: { label: 'Suivre mon dépôt', to: paths.submission(item.id) },
    secondary: ANOTHER,
    tertiary: { label: 'Continuer la visite', to: paths.museum() },
  };
}

function readyModel(item: Pick<Item, 'model3d'>): string | null {
  const { status, variants } = item.model3d;
  return status === 'ready' && variants !== null && variants.glb1k !== ''
    ? variants.glb1k
    : null;
}

/** Objects stand on a plinth even when only photographed; pictures hang on the rail. */
export function standsOnPlinth(medium: Item['medium']): boolean {
  return medium === 'sculpture' || medium === 'craft';
}

/**
 * A plinth for a work with a ready 3D model or for an object (sculpture,
 * craft), a picture rail for a work whose main media is an image, a wall
 * label for a work with nothing to show.
 */
export function hangingStand(item: Item): HangingStand {
  if (readyModel(item) !== null) {
    return 'plinth';
  }
  if (primaryImage(item) === null) {
    return 'label';
  }
  return standsOnPlinth(item.medium) ? 'plinth' : 'rail';
}

export function hangingSources(item: Item): HangingSources {
  const model = readyModel(item);
  const primary = primaryImage(item);
  const photographs = readyImages(item)
    // The main image first, as everywhere else in the museum.
    .sort((a, b) => Number(b.id === primary?.id) - Number(a.id === primary?.id))
    .map((media) => media.url);
  const poster = model === null ? '' : (item.model3d.variants?.poster ?? '');
  const images = [poster, ...photographs].filter((url) => url !== '');
  return { model, images: [...new Set(images)] };
}

export function hangingCartel(
  item: Pick<
    Item,
    'depositNumber' | 'title' | 'author' | 'medium' | 'isDemo'
  >,
  status: HangingStatus,
): HangingCartel {
  return {
    number: item.depositNumber,
    title: item.title.trim() === '' ? 'Sans titre' : item.title,
    author: item.author.trim(),
    medium: MEDIUM_LABEL[item.medium],
    note: status === 'pending' ? 'En attente de relecture' : null,
    isDemo: item.isDemo,
  };
}

/** Text alternative of the work shown in the ceremony. */
export function hangingAlt(item: Pick<Item, 'title' | 'author'>): string {
  const title = item.title.trim() === '' ? 'Œuvre sans titre' : item.title;
  return item.author.trim() === '' ? title : `${title}, ${item.author}`;
}
