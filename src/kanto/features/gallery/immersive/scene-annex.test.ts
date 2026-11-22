import { describe, expect, it } from 'vitest';
import type { Artwork, Room } from '../data/rooms';
import { rooms } from '../data/rooms';
import {
  paintingSize,
  parseDimensions,
  sceneIndexOf,
  sceneWorks,
} from './scene-annex';

function firstPainting(): Artwork {
  const artwork = rooms[0]?.artworks[0];
  if (artwork === undefined) {
    throw new Error('The painting room must hang at least one work.');
  }
  return artwork;
}

describe('parseDimensions', () => {
  it('reads height × width in centimetres into metres', () => {
    const parsed = parseDimensions('106,8 × 71,1 cm');
    expect(parsed?.height).toBeCloseTo(1.068);
    expect(parsed?.width).toBeCloseTo(0.711);
  });

  it('accepts a plain x and decimal points', () => {
    const parsed = parseDimensions('23.5 x 34.3 cm');
    expect(parsed?.height).toBeCloseTo(0.235);
    expect(parsed?.width).toBeCloseTo(0.343);
  });

  it('returns null when nothing is recorded', () => {
    expect(parseDimensions('Non renseignées')).toBeNull();
  });
});

describe('paintingSize', () => {
  it('uses the recorded dimensions when present', () => {
    const size = paintingSize(firstPainting());
    expect(size.height).toBeCloseTo(1.068);
    expect(size.width).toBeCloseTo(0.711);
  });

  it('falls back to a 0.9 m height and the image aspect, clamped', () => {
    const wide: Artwork = {
      ...firstPainting(),
      dimensions: 'Non renseignées',
      image: { ...firstPainting().image, width: 1600, height: 800 },
    };
    expect(paintingSize(wide)).toEqual({ height: 0.9, width: 1.5 });
  });
});

describe('sceneWorks', () => {
  it('hangs every work of every room with artworks, in visiting order', () => {
    const works = sceneWorks(rooms);
    const count = rooms.reduce((sum, room) => sum + room.artworks.length, 0);
    expect(works).toHaveLength(count);
    expect(works[0]).toMatchObject({
      id: 'peinture/01',
      kind: 'painting',
      roomIndex: 0,
      artworkIndex: 0,
    });
    expect(works[0]?.image).toBe(firstPainting().image.src);
  });

  it('stands a modelled work of the sculpture room on a pedestal', () => {
    const sculpture = sceneWorks(rooms).find(
      (work) => work.roomSlug === 'sculpture',
    );
    expect(sculpture?.kind).toBe('sculpture');
    expect(sculpture?.model).not.toBeNull();
    expect(sculpture?.image).toBeNull();
    expect(sculpture?.height).toBe(sculpture?.model?.displayHeight);
  });

  it('hangs a sculpture-room work without a model as a picture', () => {
    const base = rooms[1];
    if (base === undefined) {
      throw new Error('The sculpture room is missing.');
    }
    const flat: Artwork = { ...firstPainting() };
    delete flat.model;
    const source: Room[] = [{ ...base, artworks: [flat] }];
    expect(sceneWorks(source)[0]?.kind).toBe('painting');
  });
});

describe('sceneIndexOf', () => {
  const works = sceneWorks(rooms);

  it('finds the exact work of a route', () => {
    expect(sceneIndexOf(works, 'peinture', 2)).toBe(2);
  });

  it('falls back to the first work of the room', () => {
    const first = works.findIndex((work) => work.roomSlug === 'sculpture');
    expect(sceneIndexOf(works, 'sculpture', 99)).toBe(first);
    expect(sceneIndexOf(works, 'sculpture', null)).toBe(first);
  });

  it('falls back to the entrance for an unknown room', () => {
    expect(sceneIndexOf(works, 'cuisine', 0)).toBe(0);
  });
});
