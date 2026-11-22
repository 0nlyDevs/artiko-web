import type { ImageSource } from '../../lib/media/media';
import { artworkImages, objectImages } from '../../lib/media/media';
import { artworkPath, findRoom, roomPath } from '../gallery/data/rooms';
import type { Artwork, Room } from '../gallery/data/rooms';

export type HomeExhibitId =
  | 'women-in-lamba'
  | 'highlands-landscape'
  | 'bridge-at-ambaniala'
  | 'sikidy'
  | 'vilany-tany'
  | 'sinibe';

/** One element of the home hanging. Figma layers "anim:frame" and "anim:object". */
export interface HomeExhibit {
  id: HomeExhibitId;
  kind: 'frame' | 'object';
  side: 'left' | 'right';
  title: string;
  region: string;
  image: ImageSource;
  alt: string;
  focalPoint?: string | undefined;
  /** `sizes` of the responsive image: the width of the frame on each stage. */
  sizes: string;
  roomName: string;
  to: string;
  /** Parallax depth from 0 to 1. Nearer objects move more. */
  depth: number;
}

type HomeExhibitDraft = Omit<HomeExhibit, 'image'> & {
  image: ImageSource | null;
};

function requireRoom(slug: string): Room {
  const room = findRoom(slug);
  if (room === undefined) {
    throw new Error(`Unknown room: ${slug}`);
  }
  return room;
}

const painting = requireRoom('peinture');
const crafts = requireRoom('savoir-faire');

function paintingPath(number: string): string {
  const artwork = painting.artworks.find(
    (candidate) => candidate.number === number,
  );
  return artwork === undefined
    ? roomPath(painting)
    : artworkPath(painting, artwork);
}

/** A work of the painting room, so its title and description stay those of the hall. */
function requirePainting(number: string): Artwork {
  const artwork = painting.artworks.find(
    (candidate) => candidate.number === number,
  );
  if (artwork === undefined) {
    throw new Error(`Unknown painting: ${number}`);
  }
  return artwork;
}

const bridge = requirePainting('03');
const sikidy = requirePainting('04');

/*
 * The Figma frame slots were "Femmes au lamba" and "Allée des Baobabs". They
 * now hold real public-domain works: Shindler's "Malagasy Woman" on the left
 * and the 1875 "Antongona" watercolour on the right. The two other works of
 * the painting room hang below them, in landscape format, with the title, the
 * author and the description of the hall.
 *
 * The frames come first and in hanging order (upper left, upper right, lower
 * left, lower right): the intro reveals them in that order.
 *
 * Objects without a rights-cleared photograph are left out until one exists.
 * The two lower frames now hang where the pots were drawn, so the lower slots
 * must be redrawn when the photographs arrive.
 */
const drafts: readonly HomeExhibitDraft[] = [
  {
    id: 'women-in-lamba',
    kind: 'frame',
    side: 'left',
    title: 'Femme malgache',
    region: 'A. Z. Shindler, vers 1893',
    image: artworkImages.malagasyWoman,
    alt: 'Tableau : une femme malgache debout, drapée dans un lamba rayé, devant des maisons.',
    sizes: '(max-width: 767px) 32vw, 14vw',
    roomName: painting.name,
    to: paintingPath('01'),
    depth: 0.7,
  },
  {
    id: 'highlands-landscape',
    kind: 'frame',
    side: 'right',
    title: 'Antongona',
    region: 'Imerina, 1875',
    image: artworkImages.antongona,
    alt: 'Aquarelle : une colline rocheuse de l’Imerina avec des maisons, de la terre rouge et des terrasses.',
    focalPoint: '50% 45%',
    sizes: '(max-width: 767px) 32vw, 14vw',
    roomName: painting.name,
    to: paintingPath('02'),
    depth: 0.45,
  },
  {
    id: 'bridge-at-ambaniala',
    kind: 'frame',
    side: 'left',
    title: bridge.title,
    region: `${bridge.artist}, ${bridge.year}`,
    image: artworkImages.bridgeAtAmbaniala,
    alt: bridge.alt,
    sizes: '(max-width: 767px) 36vw, 17vw',
    roomName: painting.name,
    to: paintingPath(bridge.number),
    depth: 0.55,
  },
  {
    id: 'sikidy',
    kind: 'frame',
    side: 'right',
    title: sikidy.title,
    region: `${sikidy.artist}, ${sikidy.year}`,
    image: artworkImages.sikidy,
    alt: sikidy.alt,
    sizes: '(max-width: 767px) 40vw, 20vw',
    roomName: painting.name,
    to: paintingPath(sikidy.number),
    depth: 0.85,
  },
  {
    id: 'vilany-tany',
    kind: 'object',
    side: 'left',
    title: 'Vilany tany',
    region: 'Hautes Terres',
    image: objectImages.vilanyTany,
    alt: 'Vilany tany, pot de cuisson en terre cuite à large panse.',
    sizes: '20vw',
    roomName: crafts.name,
    to: roomPath(crafts),
    depth: 1,
  },
  {
    id: 'sinibe',
    kind: 'object',
    side: 'right',
    title: 'Sinibe',
    region: 'Hautes Terres',
    image: objectImages.sinibe,
    alt: 'Sinibe, grande jarre à eau en terre cuite des Hautes Terres.',
    sizes: '20vw',
    roomName: crafts.name,
    to: roomPath(crafts),
    depth: 0.85,
  },
];

export const homeExhibits: readonly HomeExhibit[] = drafts.filter(
  (draft): draft is HomeExhibit => draft.image !== null,
);
