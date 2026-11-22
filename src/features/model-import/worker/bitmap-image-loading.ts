import { ImageLoader } from "three";

/**
 * USDComposer hard-codes an ImageLoader, which creates <img> elements and so cannot run in a worker.
 * Inside the worker, images are decoded to ImageBitmap instead, which GLTFExporter accepts.
 * Only the blob: URLs that USDComposer creates for files of the archive are loaded: any other URL is
 * an external reference and must never reach the network.
 */
export function decodeImagesAsBitmaps(): void {
  // USDComposer only stores the result on texture.image, where an ImageBitmap is valid.
  ImageLoader.prototype.load = loadAsBitmap as unknown as ImageLoader["load"];
}

function loadAsBitmap(url: string, onLoad?: (image: ImageBitmap) => void, _onProgress?: unknown, onError?: (error: unknown) => void): void {
  if (!url.startsWith("blob:")) {
    onError?.(new Error(`external image refused: ${url}`));
    return;
  }
  fetch(url)
    .then((response) => response.blob())
    .then((blob) => createImageBitmap(blob))
    .then((bitmap) => onLoad?.(bitmap))
    .catch((error: unknown) => onError?.(error));
}
