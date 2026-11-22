import { describe, expect, it } from 'vitest';
import type { HangingSources } from './hanging-content';
import { initialWork, nextWork } from './work-state';

const scanned: HangingSources = {
  model: '/model.glb',
  images: ['/poster.webp', '/photo.jpg'],
};
const picture: HangingSources = { model: null, images: ['/photo.jpg'] };
const nothing: HangingSources = { model: null, images: [] };

describe('initialWork', () => {
  it('drops the live model on a plinth when WebGL can draw it', () => {
    expect(initialWork('plinth', scanned, true)).toEqual({
      kind: 'model',
      image: 0,
      ready: false,
    });
  });

  it('drops the poster of the model when WebGL is missing', () => {
    expect(initialWork('plinth', scanned, false)).toEqual({
      kind: 'poster',
      image: 0,
      ready: false,
    });
  });

  it('drops the framed picture on a rail', () => {
    expect(initialWork('rail', picture, true).kind).toBe('frame');
  });

  it('drops the label, ready at once, when there is nothing to show', () => {
    expect(initialWork('label', nothing, true)).toEqual({
      kind: 'label',
      image: 0,
      ready: true,
    });
    expect(initialWork('rail', nothing, true).kind).toBe('label');
    expect(initialWork('plinth', { model: '/m.glb', images: [] }, false).kind).toBe(
      'label',
    );
  });
});

describe('nextWork', () => {
  it('marks the work ready once it is loaded', () => {
    const model = initialWork('plinth', scanned, true);
    expect(nextWork(model, { type: 'ready' }, 2).ready).toBe(true);
  });

  it('gives way from a failed model to its poster, then to the next image', () => {
    const model = initialWork('plinth', scanned, true);
    const poster = nextWork(model, { type: 'failed' }, 2);
    expect(poster).toEqual({ kind: 'poster', image: 0, ready: false });
    const photo = nextWork(poster, { type: 'failed' }, 2);
    expect(photo).toEqual({ kind: 'poster', image: 1, ready: false });
    expect(nextWork(photo, { type: 'failed' }, 2).kind).toBe('label');
  });

  it('gives way from a failed picture to the label', () => {
    const frame = initialWork('rail', picture, true);
    expect(nextWork(frame, { type: 'failed' }, 1)).toEqual({
      kind: 'label',
      image: 0,
      ready: true,
    });
  });

  it('gives way from a failed model without any image to the label', () => {
    const model = initialWork('plinth', { model: '/m.glb', images: [] }, true);
    expect(nextWork(model, { type: 'failed' }, 0).kind).toBe('label');
  });

  it('keeps the label whatever happens', () => {
    const label = initialWork('label', nothing, true);
    expect(nextWork(label, { type: 'failed' }, 0)).toBe(label);
    expect(nextWork(label, { type: 'ready' }, 0)).toBe(label);
  });
});
