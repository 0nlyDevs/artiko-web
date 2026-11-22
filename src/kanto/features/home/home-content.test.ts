import { describe, expect, it } from 'vitest';
import { artworkImages } from '../../lib/media/media';
import { artworkPath, findRoom } from '../gallery/data/rooms';
import { homeExhibits } from './home-content';

describe('home hanging', () => {
  const frames = homeExhibits.filter((exhibit) => exhibit.kind === 'frame');

  it('hangs four frames, in hanging order: upper left, upper right, lower left, lower right', () => {
    expect(frames.map((frame) => frame.id)).toEqual([
      'women-in-lamba',
      'highlands-landscape',
      'bridge-at-ambaniala',
      'sikidy',
    ]);
    expect(frames.map((frame) => frame.side)).toEqual([
      'left',
      'right',
      'left',
      'right',
    ]);
  });

  it('links the four frames to the four works of the painting room', () => {
    expect(frames.map((frame) => frame.to)).toEqual([
      '/musee/peinture/01',
      '/musee/peinture/02',
      '/musee/peinture/03',
      '/musee/peinture/04',
    ]);
  });

  it('takes the title, the description and the image of the two lower frames from the hall', () => {
    const painting = findRoom('peinture');
    expect(painting).toBeDefined();
    const pairs = [
      { id: 'bridge-at-ambaniala', number: '03', image: artworkImages.bridgeAtAmbaniala },
      { id: 'sikidy', number: '04', image: artworkImages.sikidy },
    ] as const;

    for (const pair of pairs) {
      const frame = frames.find((candidate) => candidate.id === pair.id);
      const work = painting?.artworks.find(
        (candidate) => candidate.number === pair.number,
      );
      expect(frame).toBeDefined();
      expect(work).toBeDefined();
      if (frame === undefined || work === undefined || painting === undefined) {
        continue;
      }
      expect(frame.title).toBe(work.title);
      expect(frame.alt).toBe(work.alt);
      expect(frame.image).toBe(pair.image);
      expect(frame.image).toBe(work.image);
      expect(frame.to).toBe(artworkPath(painting, work));
      expect(frame.region).toContain(work.artist);
      expect(frame.region).toContain(work.year);
    }
  });

  it('gives every frame its own parallax depth', () => {
    const depths = frames.map((frame) => frame.depth);
    expect(new Set(depths).size).toBe(frames.length);
    for (const depth of depths) {
      expect(depth).toBeGreaterThan(0);
      expect(depth).toBeLessThanOrEqual(1);
    }
  });

  it('keeps the pottery out of the hanging while its photographs are missing', () => {
    expect(homeExhibits.filter((exhibit) => exhibit.kind === 'object')).toEqual(
      [],
    );
  });
});
