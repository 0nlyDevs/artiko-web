import type { Artist, Category, CategoryId } from '@/lib/api';

/*
 * The museum plan (Figma R8) as the API lets us draw it: one room per art
 * form, each open or still being hung, and the first artists by name.
 * Nothing here talks to the network: the server read hands in what each call
 * answered, and this module turns those answers into the plan.
 */

/** What one call to the API gave: its answer, or nothing (asleep, unreachable, too slow, refused). */
export type Read<T> = { ok: true; value: T } | { ok: false };

/**
 * `open`: the probe found a published work. `empty`: the probe answered with
 * no work. `unknown`: the probe gave nothing, so the room is neither.
 */
export type RoomState = 'open' | 'empty' | 'unknown';

export interface PlanRoom {
  /** The category id of the API. */
  id: string;
  /** The English label the API sends, kept for a category we have no translation for. */
  label: string;
  state: RoomState;
}

export interface PlanArtist {
  id: string;
  name: string;
  /** Empty when the artist gave none. */
  region: string;
}

export interface MuseumPlan {
  rooms: readonly PlanRoom[];
  artists: readonly PlanArtist[];
  /** False when a call gave nothing: some of the plan is then a fallback, not an answer. */
  complete: boolean;
}

export interface PlanAnswers {
  categories: Read<readonly Category[]>;
  /** One probe per category id: the first work of the category, if any. */
  probes: ReadonlyMap<string, Read<readonly unknown[]>>;
  artists: Read<readonly Artist[]>;
}

/** How many artists get a chip on the plan; the rest are behind "All artists". */
export const ARTIST_CHIPS = 4;

// The art forms of the contract (CategoryId in openapi.yml), in the order of GET /categories.
// The record is exhaustive, so a new id in the contract fails the type check here.
const CONTRACT_LABELS: Record<CategoryId, string> = {
  painting: 'Painting',
  sculpture: 'Sculpture',
  photography: 'Photography',
  music: 'Music',
  dance: 'Dance',
  oral_arts: 'Oral arts',
  crafts: 'Crafts',
  digital: 'Digital art',
};

/** The rooms drawn when GET /categories gave nothing: the art forms the contract declares. */
export const CONTRACT_CATEGORIES: readonly Category[] = (
  Object.keys(CONTRACT_LABELS) as CategoryId[]
).map((id) => ({ id, label: CONTRACT_LABELS[id] }));

function roomState(probe: Read<readonly unknown[]> | undefined): RoomState {
  if (probe === undefined || !probe.ok) {
    return 'unknown';
  }
  return probe.value.length > 0 ? 'open' : 'empty';
}

/** Turns what the API answered into the plan. A call that gave nothing never empties a room: it leaves it unknown. */
export function buildMuseumPlan(answers: PlanAnswers): MuseumPlan {
  const categories = answers.categories.ok
    ? answers.categories.value
    : CONTRACT_CATEGORIES;
  const rooms = categories.map((category) => ({
    id: category.id,
    label: category.label,
    state: roomState(answers.probes.get(category.id)),
  }));
  const artists = answers.artists.ok
    ? answers.artists.value.slice(0, ARTIST_CHIPS).map((artist) => ({
        id: artist.id,
        name: artist.display_name,
        region: artist.region.trim(),
      }))
    : [];
  return {
    rooms,
    artists,
    complete:
      answers.categories.ok &&
      answers.artists.ok &&
      rooms.every((room) => room.state !== 'unknown'),
  };
}

/** The plan before any answer, and when the API cannot be reached at all. */
export const UNREAD_PLAN: MuseumPlan = buildMuseumPlan({
  categories: { ok: false },
  probes: new Map(),
  artists: { ok: false },
});
