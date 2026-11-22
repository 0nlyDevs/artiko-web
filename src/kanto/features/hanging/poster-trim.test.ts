import { describe, expect, it } from 'vitest';
import { trimBox } from './poster-trim';

/** RGBA data of a `size` square, opaque inside the given pixel box. */
function square(
  size: number,
  box: { left: number; top: number; right: number; bottom: number } | null,
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(size * size * 4);
  if (box !== null) {
    for (let y = box.top; y <= box.bottom; y += 1) {
      for (let x = box.left; x <= box.right; x += 1) {
        data[(y * size + x) * 4 + 3] = 255;
      }
    }
  }
  return data;
}

describe('trimBox', () => {
  it('finds the box of the object inside its transparent margins', () => {
    const data = square(10, { left: 2, top: 3, right: 7, bottom: 8 });
    expect(trimBox(data, 10, 10)).toEqual({
      left: 0.2,
      top: 0.3,
      width: 0.6,
      height: 0.6,
    });
  });

  it('ignores the faint pixels of a soft edge', () => {
    const data = square(10, { left: 4, top: 4, right: 5, bottom: 5 });
    data[3] = 10; // nearly transparent corner
    expect(trimBox(data, 10, 10)).toEqual({
      left: 0.4,
      top: 0.4,
      width: 0.2,
      height: 0.2,
    });
  });

  it('has nothing to trim on an opaque photograph', () => {
    const data = square(8, { left: 0, top: 0, right: 7, bottom: 7 });
    expect(trimBox(data, 8, 8)).toBeNull();
  });

  it('has nothing to trim on an empty picture', () => {
    expect(trimBox(square(8, null), 8, 8)).toBeNull();
  });
});
