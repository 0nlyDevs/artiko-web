import type { Mesh, Object3D, Texture } from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { USDLoader } from "three/examples/jsm/loaders/USDLoader.js";
import { ModelImportError } from "@/features/model-import/model-import-error";
import { assertSelfContainedUsdz } from "./usdz-archive";

export async function convertUsdzToGlb(source: ArrayBuffer): Promise<ArrayBuffer> {
  assertSelfContainedUsdz(new Uint8Array(source));
  const root = await compose(source);
  if (meshesOf(root).length === 0) throw new ModelImportError("no_mesh");
  assertTexturesDecoded(root);
  return (await new GLTFExporter().parseAsync(root, { binary: true })) as ArrayBuffer;
}

function compose(source: ArrayBuffer): Promise<Object3D> {
  return new Promise((resolve, reject) => {
    const fail = (error: unknown) => reject(new ModelImportError("unreadable_usdz", String(error)));
    try {
      new USDLoader().parse(source, "", resolve, fail);
    } catch (error) {
      fail(error);
    }
  });
}

function meshesOf(root: Object3D): Mesh[] {
  const meshes: Mesh[] = [];
  root.traverse((object) => {
    if ((object as Mesh).isMesh) meshes.push(object as Mesh);
  });
  return meshes;
}

// USDLoader reports completion even when a texture failed to decode; exporting then drops the texture or throws.
function assertTexturesDecoded(root: Object3D): void {
  const undecoded = new Set<string>();
  for (const mesh of meshesOf(root)) {
    for (const material of [mesh.material].flat()) {
      for (const [slot, value] of Object.entries(material)) {
        if (isTexture(value) && imageWidth(value) <= 0) undecoded.add(`${material.name || material.uuid}.${slot}`);
      }
    }
  }
  if (undecoded.size > 0) throw new ModelImportError("unreadable_texture", [...undecoded].join(", "));
}

function imageWidth(texture: Texture): number {
  return (texture.image as { width?: number } | null)?.width ?? 0;
}

function isTexture(value: unknown): value is Texture {
  return typeof value === "object" && value !== null && (value as { isTexture?: boolean }).isTexture === true;
}
