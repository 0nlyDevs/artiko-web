import { describe, expect, it } from 'vitest';
import type { Artist, Category } from '@/lib/api';
import type { PlanAnswers, Read } from './plan';
import {
  ARTIST_CHIPS,
  buildMuseumPlan,
  CONTRACT_CATEGORIES,
  UNREAD_PLAN,
} from './plan';

const CATEGORIES: Category[] = [
  { id: 'painting', label: 'Painting' },
  { id: 'sculpture', label: 'Sculpture' },
  { id: 'photography', label: 'Photography' },
  { id: 'music', label: 'Music' },
  { id: 'dance', label: 'Dance' },
  { id: 'oral_arts', label: 'Oral arts' },
  { id: 'crafts', label: 'Crafts' },
  { id: 'digital', label: 'Digital art' },
];

function artist(name: string, region = 'Analamanga'): Artist {
  return { id: `id-${name}`, display_name: name, bio: '', region };
}

const answered = <T>(value: T): Read<T> => ({ ok: true, value });
const nothing: Read<never> = { ok: false };

/** Every category answered; those listed in `withWorks` have a first work. */
function probes(withWorks: readonly string[]): PlanAnswers['probes'] {
  return new Map(
    CATEGORIES.map((category) => [
      category.id,
      answered(withWorks.includes(category.id) ? [{ id: 'w1' }] : []),
    ]),
  );
}

describe('buildMuseumPlan', () => {
  it('draws one room per category of the API, in its order, with the API labels', () => {
    const plan = buildMuseumPlan({
      categories: answered(CATEGORIES),
      probes: probes([]),
      artists: answered([]),
    });

    expect(plan.rooms.map((room) => room.id)).toEqual([
      'painting',
      'sculpture',
      'photography',
      'music',
      'dance',
      'oral_arts',
      'crafts',
      'digital',
    ]);
    expect(plan.rooms[5]).toEqual({
      id: 'oral_arts',
      label: 'Oral arts',
      state: 'empty',
    });
  });

  it('opens the rooms whose probe found a work and leaves the others being hung', () => {
    // The hosted API today: works in painting, photography and crafts only.
    const plan = buildMuseumPlan({
      categories: answered(CATEGORIES),
      probes: probes(['painting', 'photography', 'crafts']),
      artists: answered([artist('Hei')]),
    });

    expect(
      plan.rooms.filter((room) => room.state === 'open').map((room) => room.id),
    ).toEqual(['painting', 'photography', 'crafts']);
    expect(
      plan.rooms.filter((room) => room.state === 'empty').map((room) => room.id),
    ).toEqual(['sculpture', 'music', 'dance', 'oral_arts', 'digital']);
    expect(plan.complete).toBe(true);
  });

  it('takes the state from the probes alone: a room is open as soon as its category has a work', () => {
    const plan = buildMuseumPlan({
      categories: answered(CATEGORIES),
      probes: probes(['dance', 'oral_arts']),
      artists: answered([]),
    });

    expect(
      plan.rooms.filter((room) => room.state === 'open').map((room) => room.id),
    ).toEqual(['dance', 'oral_arts']);
  });

  it('tells a failed probe from an empty room', () => {
    const answers = new Map(probes(['painting']));
    answers.set('sculpture', nothing);
    answers.delete('music');
    const plan = buildMuseumPlan({
      categories: answered(CATEGORIES),
      probes: answers,
      artists: answered([]),
    });
    const state = (id: string) =>
      plan.rooms.find((room) => room.id === id)?.state;

    expect(state('sculpture')).toBe('unknown');
    expect(state('music')).toBe('unknown');
    expect(state('dance')).toBe('empty');
    expect(state('painting')).toBe('open');
    expect(plan.complete).toBe(false);
  });

  it('keeps a category the contract does not know yet', () => {
    const plan = buildMuseumPlan({
      categories: answered([
        ...CATEGORIES,
        { id: 'street_art', label: 'Street art' } as unknown as Category,
      ]),
      probes: new Map([['street_art', answered([{ id: 'w9' }])]]),
      artists: answered([]),
    });

    expect(plan.rooms).toHaveLength(9);
    expect(plan.rooms[8]).toEqual({
      id: 'street_art',
      label: 'Street art',
      state: 'open',
    });
  });

  it('keeps the first artists by name, with their region', () => {
    const names = ['Hei', 'Hery', 'Rova', 'Voahangy', 'Zo', 'Zoly'];
    const plan = buildMuseumPlan({
      categories: answered(CATEGORIES),
      probes: probes([]),
      artists: answered([
        ...names.slice(0, 3).map((name) => artist(name)),
        artist('Voahangy', '  '),
        ...names.slice(4).map((name) => artist(name)),
      ]),
    });

    expect(ARTIST_CHIPS).toBe(4);
    expect(plan.artists.map((entry) => entry.name)).toEqual(names.slice(0, 4));
    expect(plan.artists[0]).toEqual({
      id: 'id-Hei',
      name: 'Hei',
      region: 'Analamanga',
    });
    // An artist without a region gets a chip with the name alone.
    expect(plan.artists[3]?.region).toBe('');
  });

  it('falls back on the art forms of the contract when the API is unreachable', () => {
    const plan = buildMuseumPlan({
      categories: nothing,
      probes: new Map(),
      artists: nothing,
    });

    expect(plan.rooms.map((room) => room.id)).toEqual(
      CONTRACT_CATEGORIES.map((category) => category.id),
    );
    expect(plan.rooms).toHaveLength(8);
    // Nothing was read: no room is declared empty, none is declared open.
    expect(plan.rooms.every((room) => room.state === 'unknown')).toBe(true);
    expect(plan.artists).toEqual([]);
    expect(plan.complete).toBe(false);
    expect(plan).toEqual(UNREAD_PLAN);
  });

  it('keeps the rooms it could read when only the artists are missing', () => {
    const plan = buildMuseumPlan({
      categories: answered(CATEGORIES),
      probes: probes(['painting']),
      artists: nothing,
    });

    expect(plan.rooms[0]?.state).toBe('open');
    expect(plan.rooms[1]?.state).toBe('empty');
    expect(plan.artists).toEqual([]);
    expect(plan.complete).toBe(false);
  });
});

describe('CONTRACT_CATEGORIES', () => {
  it('lists the eight art forms of the contract in the order of GET /categories', () => {
    expect(CONTRACT_CATEGORIES).toEqual(CATEGORIES);
  });
});
