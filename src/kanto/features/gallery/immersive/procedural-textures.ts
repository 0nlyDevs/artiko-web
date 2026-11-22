import { CanvasTexture, RepeatWrapping } from 'three';
import type { Texture } from 'three';

/*
 * Small grain textures generated at start-up, so velvet, plaster, varnish
 * and gilding never read as perfectly uniform surfaces. No file to load.
 */

const SIZE = 256;
const cache = new Map<string, Texture>();

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

/**
 * Grey noise blurred over a few passes, centred on mid grey. `contrast`
 * controls how far values stray from 0.5, `seed` keeps it deterministic.
 */
export function grainTexture(
  name: string,
  contrast: number,
  seed: number,
): Texture {
  const cached = cache.get(name);
  if (cached) {
    return cached;
  }
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('2D canvas is not available for procedural textures.');
  }
  const random = seededRandom(seed);
  const values = new Float32Array(SIZE * SIZE);
  for (let i = 0; i < values.length; i += 1) {
    values[i] = random();
  }
  // Two box-blur passes soften the grain into a cloth-like pattern.
  for (let pass = 0; pass < 2; pass += 1) {
    const next = new Float32Array(SIZE * SIZE);
    for (let y = 0; y < SIZE; y += 1) {
      for (let x = 0; x < SIZE; x += 1) {
        let sum = 0;
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            const sx = (x + dx + SIZE) % SIZE;
            const sy = (y + dy + SIZE) % SIZE;
            sum += values[sy * SIZE + sx] ?? 0.5;
          }
        }
        next[y * SIZE + x] = sum / 9;
      }
    }
    values.set(next);
  }
  const image = context.createImageData(SIZE, SIZE);
  for (let i = 0; i < values.length; i += 1) {
    const grey = Math.round(
      255 *
        Math.min(1, Math.max(0, 0.5 + ((values[i] ?? 0.5) - 0.5) * contrast)),
    );
    image.data[i * 4] = grey;
    image.data[i * 4 + 1] = grey;
    image.data[i * 4 + 2] = grey;
    image.data[i * 4 + 3] = 255;
  }
  context.putImageData(image, 0, 0);
  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  cache.set(name, texture);
  return texture;
}

/** Releases every generated texture, for a clean scene unmount. */
export function disposeGrainTextures(): void {
  for (const texture of cache.values()) {
    texture.dispose();
  }
  cache.clear();
}
