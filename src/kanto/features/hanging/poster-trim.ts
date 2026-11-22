/*
 * The poster of a scanned work is a square still with the object in its
 * middle. Standing on the plinth without the 3D view, it would float inside
 * its transparent margins: the trim finds the box of the object so the
 * stylesheet can stand that box on the plinth.
 */

/** A box inside an image, as shares of its width and height. */
export interface TrimBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Alpha above which a pixel belongs to the object. */
const SOLID_ALPHA = 24;
/** Side of the sample the still is drawn to before it is scanned. */
const SAMPLE = 96;

/**
 * Box of the non-transparent pixels of RGBA data, or null when the picture
 * has no transparent margin to trim (an opaque photograph, or an empty one).
 */
export function trimBox(
  rgba: ArrayLike<number>,
  width: number,
  height: number,
): TrimBox | null {
  let left = width;
  let right = -1;
  let top = height;
  let bottom = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if ((rgba[(y * width + x) * 4 + 3] ?? 0) > SOLID_ALPHA) {
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    }
  }
  if (right < 0) {
    return null;
  }
  const box = {
    left: left / width,
    top: top / height,
    width: (right - left + 1) / width,
    height: (bottom - top + 1) / height,
  };
  return box.width > 0.97 && box.height > 0.97 ? null : box;
}

/** Trim of a loaded image, or null when it is opaque or cannot be read. */
export function measureTrim(image: HTMLImageElement): TrimBox | null {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = SAMPLE;
    canvas.height = SAMPLE;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (context === null) {
      return null;
    }
    context.drawImage(image, 0, 0, SAMPLE, SAMPLE);
    return trimBox(
      context.getImageData(0, 0, SAMPLE, SAMPLE).data,
      SAMPLE,
      SAMPLE,
    );
  } catch {
    // A picture from another origin cannot be read: it stands as it is.
    return null;
  }
}
