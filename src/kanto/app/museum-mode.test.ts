import { describe, expect, it } from 'vitest';
import { detectWebGL, resolveMuseumMode } from './museum-mode';

describe('resolveMuseumMode', () => {
  it('shows the WebGL room when it can run and the room has works', () => {
    expect(
      resolveMuseumMode({ search: '', webgl: true, hasArtworks: true }),
    ).toBe('immersive');
  });

  it('falls back to the photographic room without WebGL', () => {
    expect(
      resolveMuseumMode({ search: '', webgl: false, hasArtworks: true }),
    ).toBe('photo');
  });

  it('keeps rooms in preparation on the photographic room', () => {
    expect(
      resolveMuseumMode({ search: '', webgl: true, hasArtworks: false }),
    ).toBe('photo');
  });

  it('lets the visitor ask for the photographic room with ?rendu=photo', () => {
    expect(
      resolveMuseumMode({
        search: '?rendu=photo',
        webgl: true,
        hasArtworks: true,
      }),
    ).toBe('photo');
    expect(
      resolveMuseumMode({
        search: '?rendu=3d',
        webgl: true,
        hasArtworks: true,
      }),
    ).toBe('immersive');
  });
});

describe('detectWebGL', () => {
  it('reports no WebGL where the browser has no WebGL constructor', () => {
    // jsdom defines neither WebGLRenderingContext nor canvas contexts.
    expect(detectWebGL()).toBe(false);
  });
});
