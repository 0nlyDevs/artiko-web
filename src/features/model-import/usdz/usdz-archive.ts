import { unzipSync } from "three/examples/jsm/libs/fflate.module.js";
import { USDAParser } from "three/examples/jsm/loaders/usd/USDAParser.js";
import { USDCParser } from "three/examples/jsm/loaders/usd/USDCParser.js";
import { ModelImportError } from "@/features/model-import/model-import-error";
import { findExternalReferences } from "./external-references";
import type { UsdLayer } from "./usd-layer";

const ZIP_SIGNATURE = [0x50, 0x4b];
const CRATE_SIGNATURE = new TextEncoder().encode("PXR-USDC");
const LAYER_EXTENSION = /\.(usd|usda|usdc)$/i;

/** Rejects a USDZ that is not a readable archive or that names files outside itself, before anything is composed. */
export function assertSelfContainedUsdz(source: Uint8Array): void {
  const entries = unzip(source);
  const layers = new Map<string, UsdLayer>();
  for (const [name, bytes] of Object.entries(entries)) {
    if (LAYER_EXTENSION.test(name)) layers.set(name, parseLayer(name, bytes));
  }
  if (layers.size === 0) throw new ModelImportError("unreadable_usdz", "no USD layer in the archive");
  const external = findExternalReferences(layers, new Set(Object.keys(entries)));
  if (external.length > 0) throw new ModelImportError("external_reference", external.join(", "));
}

function unzip(source: Uint8Array): Record<string, Uint8Array> {
  if (source[0] !== ZIP_SIGNATURE[0] || source[1] !== ZIP_SIGNATURE[1]) {
    throw new ModelImportError("unreadable_usdz", "not a ZIP archive");
  }
  try {
    return unzipSync(source);
  } catch (error) {
    throw new ModelImportError("unreadable_usdz", String(error));
  }
}

function parseLayer(name: string, bytes: Uint8Array): UsdLayer {
  try {
    if (startsWith(bytes, CRATE_SIGNATURE)) {
      return new USDCParser().parseData(bytes.slice().buffer);
    }
    return new USDAParser().parseData(new TextDecoder().decode(bytes));
  } catch (error) {
    throw new ModelImportError("unreadable_usdz", `${name}: ${String(error)}`);
  }
}

function startsWith(bytes: Uint8Array, prefix: Uint8Array): boolean {
  return bytes.length >= prefix.length && prefix.every((byte, index) => bytes[index] === byte);
}
