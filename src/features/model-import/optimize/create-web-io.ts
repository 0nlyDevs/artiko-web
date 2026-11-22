import { WebIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import createDecoderModule from "draco3d/draco_decoder_nodejs.js";
import createEncoderModule from "draco3d/draco_encoder_nodejs.js";

/** `wasmBaseUrl` serves draco_encoder.wasm and draco_decoder.wasm from draco3d, copied by scripts/copy-draco.mjs. */
export async function createWebIO(wasmBaseUrl: string): Promise<WebIO> {
  const locateFile = (file: string) => new URL(file, wasmBaseUrl).href;
  const [encoder, decoder] = await Promise.all([createEncoderModule({ locateFile }), createDecoderModule({ locateFile })]);
  return new WebIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ "draco3d.encoder": encoder, "draco3d.decoder": decoder });
}
