import { beforeEach, describe, expect, it } from 'vitest';
import {
  environmentLevel,
  reachWindow,
  spotFocusWeight,
  spotMaster,
  spotReach,
  surroundWeight,
} from './GalleryLighting';
import { ROOM, placeArtworks } from './gallery-layout';
import { galleryStore } from './gallery-store';
import type { SceneWork } from './scene-annex';

const WORKS: SceneWork[] = [
  {
    id: 'peinture/01',
    roomSlug: 'peinture',
    roomIndex: 0,
    artworkIndex: 0,
    kind: 'painting',
    width: 0.7,
    height: 0.9,
    image: null,
    model: null,
  },
  {
    id: 'sculpture/01',
    roomSlug: 'sculpture',
    roomIndex: 1,
    artworkIndex: 0,
    kind: 'sculpture',
    width: 0.3,
    height: 0.37,
    image: null,
    model: null,
  },
];
const [PAINTING, OBJECT] = placeArtworks(WORKS);

describe('gallery lighting', () => {
  beforeEach(() => {
    galleryStore.reset();
  });

  it('switches the spots on in turn during the entrance, and at once under reduced motion', () => {
    galleryStore.start(0);
    const entering = galleryStore.getState();
    expect(spotMaster(entering, 0, 0, false)).toBe(0);
    expect(spotMaster(entering, 0, 5000, false)).toBe(1);
    expect(spotMaster(entering, 3, 1200, false)).toBeLessThan(
      spotMaster(entering, 0, 1200, false),
    );
    expect(spotMaster(entering, 3, 0, true)).toBe(1);
  });

  it('leaves every light alone in the visit', () => {
    galleryStore.start(0, true);
    const visiting = galleryStore.getState();
    expect(spotFocusWeight(visiting, 0)).toBe(1);
    expect(spotFocusWeight(visiting, 1)).toBe(1);
    expect(surroundWeight(visiting, 0.3)).toBe(1);
  });

  it('keeps the focused work fully lit and darkens the rest of the room', () => {
    galleryStore.start(0, true);
    galleryStore.focus(1);
    const focused = galleryStore.getState();
    expect(spotFocusWeight(focused, 1)).toBeGreaterThanOrEqual(1);
    expect(spotFocusWeight(focused, 1)).toBeLessThan(1.2);
    expect(spotFocusWeight(focused, 0)).toBeLessThan(0.15);
    expect(spotFocusWeight(focused, 2)).toBeLessThan(0.15);
    expect(surroundWeight(focused, 0.3)).toBe(0.3);
  });

  it('keeps the work lit with the notice open beside it', () => {
    galleryStore.start(0, true);
    galleryStore.openNotice();
    expect(spotFocusWeight(galleryStore.getState(), 0)).toBe(1);

    galleryStore.closeNotice();
    galleryStore.focus(0);
    galleryStore.openNotice();
    expect(spotFocusWeight(galleryStore.getState(), 0)).toBeGreaterThanOrEqual(
      1,
    );
  });

  it('brings the light back when the visitor steps back', () => {
    galleryStore.start(0, true);
    galleryStore.focus(1);
    galleryStore.unfocus();
    const back = galleryStore.getState();
    expect(spotFocusWeight(back, 0)).toBe(1);
    expect(surroundWeight(back, 0.3)).toBe(1);
  });

  it('stops the spot of a focused object short of the floor, and only that one', () => {
    if (PAINTING === undefined || OBJECT === undefined) {
      throw new Error('fixtures');
    }
    // From the spot down to the object, then to the floor under it.
    const toObject = 3.3;
    const toFloor = toObject + ROOM.pedestalHeight;
    galleryStore.start(0, true);
    const visit = spotReach(galleryStore.getState(), OBJECT, toObject);
    expect(reachWindow(toFloor, visit)).toBeGreaterThan(0.95);

    galleryStore.focus(OBJECT.index);
    const focused = spotReach(galleryStore.getState(), OBJECT, toObject);
    expect(focused).toBeGreaterThan(toObject);
    expect(focused).toBeLessThan(visit);
    // The object keeps a good share of the light, the floor almost none.
    expect(reachWindow(toObject, focused)).toBeGreaterThan(0.3);
    expect(reachWindow(toFloor, focused)).toBeLessThan(0.02);
    expect(spotReach(galleryStore.getState(), PAINTING, toObject)).toBe(visit);

    // A painting hangs on the wall its spot lights: its reach never shortens.
    galleryStore.focus(PAINTING.index);
    expect(spotReach(galleryStore.getState(), PAINTING, toObject)).toBe(visit);
    expect(spotReach(galleryStore.getState(), OBJECT, toObject)).toBe(visit);
  });

  it('lets no light through past the reach of a spot', () => {
    expect(reachWindow(0, 5)).toBe(1);
    expect(reachWindow(5, 5)).toBe(0);
    expect(reachWindow(9, 5)).toBe(0);
    expect(reachWindow(2, 5)).toBeGreaterThan(reachWindow(4, 5));
  });

  it('reflects less on low power devices', () => {
    expect(environmentLevel(true)).toBeLessThan(environmentLevel(false));
  });
});
