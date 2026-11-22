import type { CategoryId } from '@/lib/api';
import type { MuseumPlan, RoomState } from '../../../lib/museum-data/plan';
import type { RoomSlug } from '../data/rooms';
import { roomPath, rooms } from '../data/rooms';

/*
 * What the plan (Figma R8) draws for each room, and where each link leads.
 * Every destination is an address that exists today: a KANTO demonstration
 * room, or a page of the application.
 */

/**
 * The art form each KANTO demonstration room stands for. "Savoir-faire" is
 * not a category of the API: its weaving, basketry and pottery are the crafts.
 */
export const DEMO_ROOM_CATEGORY: Record<RoomSlug, CategoryId> = {
  peinture: 'painting',
  sculpture: 'sculpture',
  'savoir-faire': 'crafts',
  musique: 'music',
};

/** Addresses of the application pages the plan links to. They load another document than the museum. */
export const planHrefs = {
  /** The works of one art form, in Explore. */
  category: (categoryId: string): string =>
    `/explore?category=${encodeURIComponent(categoryId)}`,
  /** The 3D room of one artist. */
  artistRoom: (artistId: string): string =>
    `/artists/${encodeURIComponent(artistId)}/museum`,
  /** The artists of Explore: the row carries this id. */
  allArtists: '/explore#artists-title',
  /** The Panthéon of the current month, on the art form of the room when it has one. */
  pantheon: (categoryId?: string): string =>
    categoryId === undefined
      ? '/hall-of-fame'
      : `/hall-of-fame?category=${encodeURIComponent(categoryId)}`,
  publish: '/me?tab=publish',
  account: '/me',
  heritage: '/heritage',
  scan: '/scan',
} as const;

export type RoomDestination =
  /** A KANTO room: the museum's own router moves there without leaving the document. */
  | { kind: 'room'; to: string }
  /** A page of the application. */
  | { kind: 'page'; href: string };

export interface PlanRoomView {
  id: string;
  /** Two digits, in the order of the API: "01" to "08". */
  number: string;
  /** For the category helper, which translates the id and falls back on the API label. */
  category: { id: string; label: string };
  state: RoomState;
  /** The visitor stands in this room. */
  current: boolean;
  /** Null when there is nothing to enter: an empty art form without a room of its own. */
  destination: RoomDestination | null;
}

/**
 * The rooms of the plan, seen from the room the visitor stands in.
 * An art form with a demonstration room opens that room, whatever its state:
 * the room exists and shows its own "hanging in progress" wall when empty.
 * Any other art form opens its works in Explore, unless the probe found none.
 */
export function planRoomViews(
  plan: MuseumPlan,
  activeRoomSlug: string,
): PlanRoomView[] {
  return plan.rooms.map((room, index) => {
    const demoRoom = rooms.find(
      (candidate) => DEMO_ROOM_CATEGORY[candidate.slug] === room.id,
    );
    let destination: RoomDestination | null = null;
    if (demoRoom !== undefined) {
      destination = { kind: 'room', to: roomPath(demoRoom) };
    } else if (room.state !== 'empty') {
      destination = { kind: 'page', href: planHrefs.category(room.id) };
    }
    return {
      id: room.id,
      number: String(index + 1).padStart(2, '0'),
      category: { id: room.id, label: room.label },
      state: room.state,
      current: demoRoom !== undefined && demoRoom.slug === activeRoomSlug,
      destination,
    };
  });
}

/** The art form of the room the visitor stands in, if that room stands for one. */
export function currentCategory(
  views: readonly PlanRoomView[],
): string | undefined {
  return views.find((view) => view.current)?.id;
}
