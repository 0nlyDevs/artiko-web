import { MAX_SOURCE_BYTES, MAX_UPLOAD_BYTES, TEXTURE_SIZE_1K, TEXTURE_SIZE_2K } from "./limits";
import { ModelImportError } from "./model-import-error";

export interface ModelConverter {
  convertUsdz(source: ArrayBuffer): Promise<ArrayBuffer>;
}

export interface ModelOptimizer {
  /** Must not detach `glb`: the same source is optimized twice. */
  optimize(glb: ArrayBuffer, textureSize: number): Promise<ArrayBuffer>;
}

export interface PosterRenderer {
  /** Must not detach `glb`. */
  render(glb: ArrayBuffer): Promise<Blob>;
}

export interface ModelImportDependencies {
  converter: ModelConverter;
  optimizer: ModelOptimizer;
  posterRenderer: PosterRenderer;
}

export type ImportStep = "conversion" | "optimization2k" | "optimization1k" | "poster";

export interface ImportedModel {
  model1k: File;
  model2k: File;
  poster: File;
  /** Variants above the API upload limit: the form must refuse to publish them. */
  oversized: ("1k" | "2k")[];
}

export async function importModel(
  file: File,
  dependencies: ModelImportDependencies,
  onStep: (step: ImportStep) => void,
): Promise<ImportedModel> {
  const format = sourceFormatOf(file);
  if (file.size > MAX_SOURCE_BYTES) throw new ModelImportError("source_too_large", String(file.size));
  const source = await file.arrayBuffer();

  let glb = source;
  if (format === "usdz") {
    onStep("conversion");
    glb = await dependencies.converter.convertUsdz(source);
  }
  onStep("optimization2k");
  const model2k = await dependencies.optimizer.optimize(glb, TEXTURE_SIZE_2K);
  onStep("optimization1k");
  const model1k = await dependencies.optimizer.optimize(glb, TEXTURE_SIZE_1K);
  onStep("poster");
  const poster = await dependencies.posterRenderer.render(model1k);

  const baseName = file.name.replace(/\.[^.]*$/, "") || "model";
  const variants = { "1k": model1k, "2k": model2k };
  return {
    model1k: new File([model1k], `${baseName}-1k.glb`, { type: "model/gltf-binary" }),
    model2k: new File([model2k], `${baseName}-2k.glb`, { type: "model/gltf-binary" }),
    poster: new File([poster], `${baseName}-poster.${poster.type === "image/webp" ? "webp" : "jpg"}`, { type: poster.type }),
    oversized: (Object.keys(variants) as ("1k" | "2k")[]).filter((key) => variants[key].byteLength > MAX_UPLOAD_BYTES),
  };
}

export function isImportableModel(file: File): boolean {
  return /\.(usdz|glb)$/i.test(file.name);
}

function sourceFormatOf(file: File): "usdz" | "glb" {
  if (/\.usdz$/i.test(file.name)) return "usdz";
  if (/\.glb$/i.test(file.name)) return "glb";
  throw new ModelImportError("unsupported_format", file.name);
}
