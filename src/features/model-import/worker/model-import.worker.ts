import type { WebIO } from "@gltf-transform/core";
import { DRACO3D_WASM_PATH, DRACO_DECODER_PATH } from "@/lib/draco";
import { ModelImportError } from "@/features/model-import/model-import-error";
import { createWebIO } from "@/features/model-import/optimize/create-web-io";
import { optimizeGlb } from "@/features/model-import/optimize/optimize-glb";
import { canEncodeWebp } from "@/features/model-import/optimize/webp-support";
import { convertUsdzToGlb } from "@/features/model-import/usdz/usdz-to-glb";
import { renderPoster } from "@/features/model-import/poster/render-poster";
import { decodeImagesAsBitmaps } from "./bitmap-image-loading";
import type { WorkerRequest, WorkerResponse } from "./protocol";

const DRACO_WASM_URL = new URL(DRACO3D_WASM_PATH, self.location.origin).href;

decodeImagesAsBitmaps();

let optimizer: Promise<{ io: WebIO; webp: boolean }> | undefined;

function getOptimizer() {
  optimizer ??= Promise.all([createWebIO(DRACO_WASM_URL), canEncodeWebp()]).then(([io, webp]) => ({ io, webp }));
  return optimizer;
}

async function handle(request: WorkerRequest): Promise<Blob | ArrayBuffer> {
  if (request.kind === "convert") return convertUsdzToGlb(request.source);
  if (request.kind === "poster") return renderPoster(request.glb, DRACO_DECODER_PATH);
  const { io, webp } = await getOptimizer();
  try {
    const bytes = await optimizeGlb(io, new Uint8Array(request.glb), {
      textureSize: request.textureSize,
      textureFormat: webp ? "image/webp" : undefined,
    });
    return bytes.slice().buffer;
  } catch (error) {
    throw new ModelImportError("optimization_failed", String(error));
  }
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { id } = event.data;
  let response: WorkerResponse;
  try {
    const result = await handle(event.data);
    const bytes = result instanceof Blob ? await result.arrayBuffer() : result;
    response = { id, ok: true, bytes, mimeType: result instanceof Blob ? result.type : undefined };
    self.postMessage(response, { transfer: [bytes] });
  } catch (error) {
    response = error instanceof ModelImportError
      ? { id, ok: false, code: error.code, detail: error.message }
      : { id, ok: false, code: "optimization_failed", detail: String(error) };
    self.postMessage(response);
  }
};
