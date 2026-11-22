/*
 * Mock uploads keep images as small data URLs so a submission survives a
 * reload. Other files stay as object URLs for the session only.
 */

const MAX_EDGE = 1200;
const QUALITY = 0.82;

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(typeof reader.result === 'string' ? reader.result : '');
    };
    reader.onerror = () => {
      reject(new Error('read failed'));
    };
    reader.readAsDataURL(file);
  });
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      resolve(image);
    };
    image.onerror = () => {
      reject(new Error('decode failed'));
    };
    image.src = url;
  });
}

export interface StoredImage {
  url: string;
  width: number | null;
  height: number | null;
  persistent: boolean;
}

/** Downscales an image file to a data URL. Falls back to an object URL. */
export async function storeImage(file: File): Promise<StoredImage> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl);
    const scale = Math.min(1, MAX_EDGE / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext('2d');
    if (context === null) {
      throw new Error('no canvas');
    }
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const url = canvas.toDataURL('image/jpeg', QUALITY);
    URL.revokeObjectURL(objectUrl);
    return {
      url,
      width: image.width,
      height: image.height,
      persistent: true,
    };
  } catch {
    try {
      const url = await readAsDataUrl(file);
      if (url !== '' && url.length < 2_000_000) {
        URL.revokeObjectURL(objectUrl);
        return { url, width: null, height: null, persistent: true };
      }
    } catch {
      // keep the object URL below
    }
    return { url: objectUrl, width: null, height: null, persistent: false };
  }
}
