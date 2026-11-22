import { describe, expect, it } from "vitest";
import { findExternalReferences } from "./external-references";
import type { UsdLayer } from "./usd-layer";

const layer = (fields: Record<string, Record<string, unknown>>): UsdLayer => ({
  specsByPath: Object.fromEntries(Object.entries(fields).map(([path, value]) => [path, { fields: value }])),
});
const texture = (path: string) => layer({ "/Root/Tex.inputs:file": { typeName: "asset", default: path } });
const entries = new Set(["scene.usdc", "0/tex.png", "parts/wheel.usdc", "parts/wheel.png"]);

describe("findExternalReferences", () => {
  it("accepts textures and layers packed in the archive, relative to the layer that names them", () => {
    const layers = new Map([
      ["scene.usdc", layer({
        "/Root/Tex.inputs:file": { typeName: "asset", default: "0/tex.png" },
        "/Root/Wheel": { references: ["@./parts/wheel.usdc@</Wheel>"] },
      })],
      ["parts/wheel.usdc", texture("wheel.png")],
    ]);

    expect(findExternalReferences(layers, entries)).toEqual([]);
  });

  it.each([
    ["a missing texture", "0/missing.png"],
    ["an absolute device path", "/private/var/mobile/tex.png"],
    ["a web URL", "https://example.com/tex.png"],
    ["a path climbing out of the archive", "../tex.png"],
  ])("reports %s", (_, path) => {
    expect(findExternalReferences(new Map([["scene.usdc", texture(path)]]), entries)).toEqual([path]);
  });

  it("reports layer references, payloads and asset arrays written as @path@ or assetPath", () => {
    const layers = new Map([["scene.usdc", layer({
      "/A": { references: ["@other.usda@"] },
      "/B": { payload: { assetPath: "far/payload.usdc", primPath: "/B" } },
      "/C.textures": { typeName: "asset[]", default: ["@0/tex.png@", "@0/gone.png@"] },
    })]]);

    expect(findExternalReferences(layers, entries).sort()).toEqual(["0/gone.png", "far/payload.usdc", "other.usda"]);
  });

  it("ignores plain strings such as the documentation path Reality Composer writes", () => {
    const layers = new Map([["scene.usdc", layer({
      "/": { documentation: "Generated from /private/var/mobile/Library/scan.usda" },
    })]]);

    expect(findExternalReferences(layers, entries)).toEqual([]);
  });
});
