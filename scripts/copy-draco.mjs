// Serves the Draco codecs from this origin instead of www.gstatic.com (drei and model-viewer defaults).
// Paths must match src/lib/draco.ts. The copies are generated, not committed.
import { cp, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const publicDir = path.join(import.meta.dirname, "..", "public");
const threeDecoder = path.dirname(require.resolve("three/examples/jsm/libs/draco/gltf/draco_decoder.js"));
const draco3d = path.dirname(require.resolve("draco3d/package.json"));

const copies = [
  // Decoder for GLTFLoader (museum, poster) and model-viewer.
  ...["draco_decoder.js", "draco_decoder.wasm", "draco_wasm_wrapper.js"].map((file) => [path.join(threeDecoder, file), path.join(publicDir, "draco", file)]),
  // WebAssembly of the encoder and decoder that glTF-Transform loads in the import worker.
  ...["draco_encoder.wasm", "draco_decoder.wasm"].map((file) => [path.join(draco3d, file), path.join(publicDir, "draco3d", file)]),
];

for (const [from, to] of copies) {
  await mkdir(path.dirname(to), { recursive: true });
  await cp(from, to);
}
console.log(`Copied ${copies.length} Draco files into public/draco and public/draco3d`);
