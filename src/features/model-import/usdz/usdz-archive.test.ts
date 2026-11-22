import { describe, expect, it } from "vitest";
import { cubeUsda, texturedCubeUsdz, usdz } from "@/features/model-import/testing/usdz-fixtures";
import { assertSelfContainedUsdz } from "./usdz-archive";

describe("assertSelfContainedUsdz (CA4)", () => {
  it("accepts a scan whose layer only names files of its archive", () => {
    expect(() => assertSelfContainedUsdz(texturedCubeUsdz())).not.toThrow();
  });

  it.each([
    ["an empty file", new Uint8Array()],
    ["a file that is not a ZIP archive", new TextEncoder().encode("#usda 1.0")],
    ["a truncated archive", texturedCubeUsdz().slice(0, 200)],
    ["an archive without a USD layer", usdz({ "readme.txt": "hello" })],
  ])("refuses %s as unreadable", (_, bytes) => {
    expect(() => assertSelfContainedUsdz(bytes)).toThrowError(expect.objectContaining({ code: "unreadable_usdz" }));
  });

  it("refuses a texture outside the archive before any of it is loaded", () => {
    const external = usdz({ "cube.usda": cubeUsda({ texturePath: "https://example.com/color.png" }) });

    expect(() => assertSelfContainedUsdz(external)).toThrowError(
      expect.objectContaining({ code: "external_reference", message: expect.stringContaining("https://example.com/color.png") }),
    );
  });
});
