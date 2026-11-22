import type { UsdLayer } from "./usd-layer";

const DELIMITED_ASSET_PATH = /@([^@]+)@/g;
const URL_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

/** Asset paths (layers, payloads, textures) that a USDZ layer names but its own archive does not contain. */
export function findExternalReferences(layers: ReadonlyMap<string, UsdLayer>, entryNames: ReadonlySet<string>): string[] {
  const external = new Set<string>();
  for (const [layerPath, layer] of layers) {
    for (const spec of Object.values(layer.specsByPath)) {
      for (const assetPath of collectAssetPaths(spec.fields)) {
        if (!isInsideArchive(assetPath, directoryOf(layerPath), entryNames)) external.add(assetPath);
      }
    }
  }
  return [...external];
}

function collectAssetPaths(fields: Record<string, unknown>): string[] {
  const paths: string[] = [];
  const isAssetAttribute = typeof fields.typeName === "string" && fields.typeName.startsWith("asset");
  if (isAssetAttribute) paths.push(...stringsIn(fields.default).map(stripDelimiters));
  walk(fields, (value) => {
    for (const match of value.matchAll(DELIMITED_ASSET_PATH)) paths.push(match[1]);
  }, (record) => {
    if (typeof record.assetPath === "string" && record.assetPath !== "") paths.push(record.assetPath);
  });
  return paths.filter((path) => path !== "");
}

function walk(value: unknown, onString: (value: string) => void, onRecord: (value: Record<string, unknown>) => void): void {
  if (typeof value === "string") {
    onString(value);
  } else if (Array.isArray(value)) {
    for (const item of value) walk(item, onString, onRecord);
  } else if (value !== null && typeof value === "object" && !ArrayBuffer.isView(value)) {
    const record = value as Record<string, unknown>;
    onRecord(record);
    for (const item of Object.values(record)) walk(item, onString, onRecord);
  }
}

function stringsIn(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  return [];
}

function stripDelimiters(path: string): string {
  return path.startsWith("@") && path.endsWith("@") ? path.slice(1, -1) : path;
}

function directoryOf(path: string): string {
  const slash = path.lastIndexOf("/");
  return slash < 0 ? "" : path.slice(0, slash);
}

function isInsideArchive(assetPath: string, layerDirectory: string, entryNames: ReadonlySet<string>): boolean {
  if (URL_SCHEME.test(assetPath) || assetPath.startsWith("/")) return false;
  const relative = assetPath.replace(/^\.\//, "");
  const resolved = normalize(layerDirectory ? `${layerDirectory}/${relative}` : relative);
  // USDComposer falls back to the unresolved path when the resolved one is missing.
  return (resolved !== null && entryNames.has(resolved)) || entryNames.has(relative);
}

function normalize(path: string): string | null {
  const parts: string[] = [];
  for (const part of path.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") {
      if (parts.length === 0) return null;
      parts.pop();
    } else {
      parts.push(part);
    }
  }
  return parts.join("/");
}
