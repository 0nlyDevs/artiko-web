import { describe, expect, it } from 'vitest';
import type { MuseumPlan, RoomState } from '../../../lib/museum-data/plan';
import { UNREAD_PLAN } from '../../../lib/museum-data/plan';
import { rooms } from '../data/rooms';
import {
  currentCategory,
  DEMO_ROOM_CATEGORY,
  planHrefs,
  planRoomViews,
} from './plan-view';

const ORDER = [
  'painting',
  'sculpture',
  'photography',
  'music',
  'dance',
  'oral_arts',
  'crafts',
  'digital',
];

function plan(states: Partial<Record<string, RoomState>>): MuseumPlan {
  return {
    rooms: ORDER.map((id) => ({ id, label: id, state: states[id] ?? 'empty' })),
    artists: [],
    complete: true,
  };
}

describe('planRoomViews', () => {
  it('numbers the eight rooms in the order of the API', () => {
    const views = planRoomViews(plan({}), 'peinture');

    expect(views.map((view) => view.number)).toEqual([
      '01',
      '02',
      '03',
      '04',
      '05',
      '06',
      '07',
      '08',
    ]);
    expect(views.map((view) => view.id)).toEqual(ORDER);
  });

  it('gives every KANTO demonstration room an art form of the API', () => {
    for (const room of rooms) {
      expect(ORDER).toContain(DEMO_ROOM_CATEGORY[room.slug]);
    }
    expect(new Set(Object.values(DEMO_ROOM_CATEGORY)).size).toBe(rooms.length);
  });

  it('opens the demonstration room of a category that has one', () => {
    const views = planRoomViews(plan({ painting: 'open', crafts: 'open' }), '');
    const destination = (id: string) =>
      views.find((view) => view.id === id)?.destination;

    expect(destination('painting')).toEqual({
      kind: 'room',
      to: '/musee/peinture/01',
    });
    expect(destination('crafts')).toEqual({
      kind: 'room',
      to: '/musee/savoir-faire',
    });
  });

  it('opens the works of any other category in Explore', () => {
    const views = planRoomViews(plan({ photography: 'open' }), 'peinture');

    expect(views.find((view) => view.id === 'photography')?.destination).toEqual(
      { kind: 'page', href: '/explore?category=photography' },
    );
  });

  it('gives no way into an empty category without a room, and keeps the demonstration room of an empty one', () => {
    const views = planRoomViews(plan({}), 'peinture');
    const view = (id: string) => views.find((entry) => entry.id === id);

    expect(view('dance')?.state).toBe('empty');
    expect(view('dance')?.destination).toBeNull();
    expect(view('digital')?.destination).toBeNull();
    // Sculpture has no published work, but its WebGL room still exists.
    expect(view('sculpture')?.state).toBe('empty');
    expect(view('sculpture')?.destination).toEqual({
      kind: 'room',
      to: '/musee/sculpture/01',
    });
  });

  it('keeps every room reachable when nothing could be read', () => {
    const views = planRoomViews(UNREAD_PLAN, 'musique');

    expect(views).toHaveLength(8);
    expect(views.every((view) => view.destination !== null)).toBe(true);
    expect(views.find((view) => view.id === 'dance')?.destination).toEqual({
      kind: 'page',
      href: '/explore?category=dance',
    });
  });

  it('marks the room the visitor stands in', () => {
    const views = planRoomViews(plan({ crafts: 'open' }), 'savoir-faire');

    expect(views.filter((view) => view.current).map((view) => view.id)).toEqual(
      ['crafts'],
    );
    expect(currentCategory(views)).toBe('crafts');
    expect(currentCategory(planRoomViews(plan({}), 'inconnue'))).toBeUndefined();
  });
});

describe('planHrefs', () => {
  it('points at addresses of the application that exist today', () => {
    expect(planHrefs.artistRoom('a 1')).toBe('/artists/a%201/museum');
    expect(planHrefs.allArtists.startsWith('/explore')).toBe(true);
    expect(planHrefs.pantheon()).toBe('/hall-of-fame');
    expect(planHrefs.pantheon('painting')).toBe(
      '/hall-of-fame?category=painting',
    );
    expect(planHrefs.publish).toBe('/me?tab=publish');
  });
});
