import { describe, expect, it } from 'vitest';
import type { PublishedWork } from '../../../lib/museum-data/published-works';
import { toPublishedWorks } from '../../../lib/museum-data/published-works';
import { installPublishedWorks } from './published';
import type { Room } from './rooms';
import { rooms } from './rooms';

function work(id: string, category: string): PublishedWork {
  return { id, title: `Œuvre ${id}`, artistName: 'Rova', category, mediaKind: 'image', mediaUrl: `http://localhost:8000/media/${id}.jpg`, modelHdUrl: null, posterUrl: null, story: '' };
}

function copyOfRooms(): Room[] {
  return rooms.map((room) => ({ ...room, artworks: [...room.artworks] }));
}

describe('installPublishedWorks', () => {
  it('hangs the works of the API in the room of their art form, numbered from 01', () => {
    const target = copyOfRooms();
    installPublishedWorks([work('a', 'painting'), work('b', 'photography'), work('c', 'crafts')], target);

    const painting = target.find((room) => room.slug === 'peinture');
    const crafts = target.find((room) => room.slug === 'savoir-faire');
    expect(painting?.artworks.map((artwork) => [artwork.number, artwork.title])).toEqual([
      ['01', 'Œuvre a'],
      ['02', 'Œuvre b'],
    ]);
    expect(crafts?.artworks[0]?.image.src).toBe('http://localhost:8000/media/c.jpg');
    expect(crafts?.artworks[0]?.isDemo).toBe(false);
  });

  it('leaves a room without published work as it was', () => {
    const target = copyOfRooms();
    const before = target.find((room) => room.slug === 'sculpture')?.artworks;
    installPublishedWorks([work('a', 'painting')], target);

    expect(target.find((room) => room.slug === 'sculpture')?.artworks).toBe(before);
  });
});

describe('toPublishedWorks', () => {
  it('keeps the image works only', () => {
    const answer = [
      { id: '1', title: 'A', artist_name: 'R', category: 'painting', media_kind: 'image', media_url: 'u1', story: null },
      { id: '2', title: 'B', artist_name: 'R', category: 'music', media_kind: 'audio', media_url: 'u2' },
    ];
    expect(toPublishedWorks(answer).map((entry) => entry.id)).toEqual(['1']);
  });
});
