import type { WebIO } from "@gltf-transform/core";
import {
  dedup,
  draco,
  flatten,
  instance,
  join,
  palette,
  prune,
  resample,
  sparse,
  weld,
} from "@gltf-transform/functions";
import { canvasTextureCompress } from "./canvas-texture-compress";

export interface OptimizeOptions {
  textureSize: number;
  /** Undefined keeps each texture in its source format, for browsers that cannot encode WebP. */
  textureFormat: "image/webp" | undefined;
}

// sharp's default WebP quality, which the reference CLI runs used.
const TEXTURE_QUALITY = 0.8;

// Same steps and order as `gltf-transform optimize --compress draco --texture-compress webp` (CLI 4.5.1),
// without `simplify`, which needs the meshoptimizer package, and with a canvas texture encoder instead of sharp.
export async function optimizeGlb(io: WebIO, glb: Uint8Array, options: OptimizeOptions): Promise<Uint8Array> {
  const document = await io.readBinary(glb);
  await document.transform(
    dedup(),
    instance(),
    palette(),
    flatten(),
    join(),
    weld(),
    resample(),
    prune({ keepAttributes: false, keepIndices: false, keepLeaves: false, keepSolidTextures: false }),
    sparse(),
    canvasTextureCompress({ maxSize: options.textureSize, mimeType: options.textureFormat, quality: TEXTURE_QUALITY }),
    draco(),
  );
  return io.writeBinary(document);
}
