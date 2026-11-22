import { ImageUtils, type Document, type Texture, type Transform } from "@gltf-transform/core";
import { EXTTextureWebP } from "@gltf-transform/extensions";
import { fitWithin } from "@gltf-transform/functions";

export interface CanvasTextureCompressOptions {
  maxSize: number;
  /** Undefined keeps each texture in its source format. */
  mimeType: "image/webp" | undefined;
  quality: number;
}

const ENCODABLE = new Set(["image/png", "image/jpeg", "image/webp"]);

/**
 * Resizes and re-encodes textures with OffscreenCanvas. textureCompress() also falls back to a canvas
 * without sharp, but then passes no `quality` to convertToBlob: in Chrome 148 the 1K scan weighed 1.2 MB
 * instead of 74 KB with sharp.
 */
export function canvasTextureCompress(options: CanvasTextureCompressOptions): Transform {
  return async (document: Document) => {
    const textures = document.getRoot().listTextures().filter((texture) => ENCODABLE.has(texture.getMimeType()));
    for (const texture of textures) await compress(texture, options);
    const webp = document.createExtension(EXTTextureWebP);
    if (document.getRoot().listTextures().some((texture) => texture.getMimeType() === "image/webp")) {
      webp.setRequired(true);
    } else {
      webp.dispose();
    }
  };
}

async function compress(texture: Texture, options: CanvasTextureCompressOptions): Promise<void> {
  const sourceType = texture.getMimeType();
  const source = texture.getImage();
  if (!source) return;
  // Normal and metallic-roughness maps hold data, not colours: no colour management or premultiplication.
  const bitmap = await createImageBitmap(new Blob([source.slice()], { type: sourceType }), {
    colorSpaceConversion: "none",
    premultiplyAlpha: "none",
  });
  const sourceSize: [number, number] = [bitmap.width, bitmap.height];
  const [width, height] = fitWithin(sourceSize, [options.maxSize, options.maxSize]);
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("2D canvas unavailable");
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const targetType = options.mimeType ?? sourceType;
  const encoded = await canvas.convertToBlob({ type: targetType, quality: options.quality });
  if (encoded.type !== targetType) throw new Error(`browser encoded ${encoded.type} instead of ${targetType}`);
  const resized = width !== sourceSize[0] || height !== sourceSize[1];
  if (!resized && targetType === sourceType && encoded.size >= source.byteLength) return;

  texture.setImage(new Uint8Array(await encoded.arrayBuffer())).setMimeType(targetType);
  const uri = texture.getURI();
  if (uri) texture.setURI(uri.replace(/\.[^./]+$/, `.${ImageUtils.mimeTypeToExtension(targetType)}`));
}
