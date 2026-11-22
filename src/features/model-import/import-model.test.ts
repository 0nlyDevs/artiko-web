import { describe, expect, it, vi } from "vitest";
import { importModel, type ImportStep, type ModelImportDependencies } from "./import-model";
import { MAX_SOURCE_BYTES, MAX_UPLOAD_BYTES } from "./limits";
import { ModelImportError } from "./model-import-error";

const bytes = (length: number, fill = 1) => new Uint8Array(length).fill(fill).buffer;

function fakes(overrides: Partial<{ variantBytes: Record<number, number> }> = {}) {
  const variantBytes = overrides.variantBytes ?? { 2048: 200, 1024: 100 };
  const calls: string[] = [];
  const dependencies: ModelImportDependencies = {
    converter: {
      convertUsdz: vi.fn(async (source: ArrayBuffer) => {
        calls.push(`convert:${source.byteLength}`);
        return bytes(50, 2);
      }),
    },
    optimizer: {
      optimize: vi.fn(async (glb: ArrayBuffer, textureSize: number) => {
        calls.push(`optimize:${textureSize}:${glb.byteLength}`);
        return bytes(variantBytes[textureSize]);
      }),
    },
    posterRenderer: {
      render: vi.fn(async (glb: ArrayBuffer) => {
        calls.push(`poster:${glb.byteLength}`);
        return new Blob([new Uint8Array(10)], { type: "image/webp" });
      }),
    },
  };
  return { dependencies, calls };
}

const usdzFile = (size = 30) => new File([new Uint8Array(size)], "Scan.usdz");

describe("importModel", () => {
  it("converts a USDZ, optimizes it at 2K then 1K and renders the poster from the 1K variant (CA1, CA6)", async () => {
    const { dependencies, calls } = fakes();
    const steps: ImportStep[] = [];

    const model = await importModel(usdzFile(), dependencies, (step) => steps.push(step));

    expect(steps).toEqual(["conversion", "optimization2k", "optimization1k", "poster"]);
    expect(calls).toEqual(["convert:30", "optimize:2048:50", "optimize:1024:50", "poster:100"]);
    expect(model.model1k).toMatchObject({ name: "Scan-1k.glb", size: 100, type: "model/gltf-binary" });
    expect(model.model2k).toMatchObject({ name: "Scan-2k.glb", size: 200, type: "model/gltf-binary" });
    expect(model.poster).toMatchObject({ name: "Scan-poster.webp", size: 10, type: "image/webp" });
    expect(model.oversized).toEqual([]);
  });

  it("optimizes a GLB without converting it and produces the same three files (CA2)", async () => {
    const { dependencies, calls } = fakes();
    const steps: ImportStep[] = [];

    const model = await importModel(new File([new Uint8Array(40)], "piece.GLB"), dependencies, (step) => steps.push(step));

    expect(dependencies.converter.convertUsdz).not.toHaveBeenCalled();
    expect(steps).toEqual(["optimization2k", "optimization1k", "poster"]);
    expect(calls).toEqual(["optimize:2048:40", "optimize:1024:40", "poster:100"]);
    expect([model.model1k.name, model.model2k.name, model.poster.name]).toEqual(["piece-1k.glb", "piece-2k.glb", "piece-poster.webp"]);
  });

  it("names a JPEG poster from a browser without a WebP encoder", async () => {
    const { dependencies } = fakes();
    dependencies.posterRenderer.render = async () => new Blob([new Uint8Array(3)], { type: "image/jpeg" });

    const model = await importModel(usdzFile(), dependencies, () => {});

    expect(model.poster).toMatchObject({ name: "Scan-poster.jpg", type: "image/jpeg" });
  });

  it("flags each variant above the 20 MB upload limit (CA5)", async () => {
    const { dependencies } = fakes({ variantBytes: { 2048: MAX_UPLOAD_BYTES + 1, 1024: MAX_UPLOAD_BYTES } });

    const model = await importModel(usdzFile(), dependencies, () => {});

    expect(model.oversized).toEqual(["2k"]);
  });

  it("refuses a USDZ over 150 MB before reading or converting it", async () => {
    const { dependencies } = fakes();
    const huge = usdzFile();
    Object.defineProperty(huge, "size", { value: MAX_SOURCE_BYTES + 1 });
    const read = vi.spyOn(huge, "arrayBuffer");

    await expect(importModel(huge, dependencies, () => {})).rejects.toMatchObject({ code: "source_too_large" });
    expect(read).not.toHaveBeenCalled();
    expect(dependencies.converter.convertUsdz).not.toHaveBeenCalled();
  });

  it("refuses other formats", async () => {
    const { dependencies } = fakes();

    await expect(importModel(new File(["x"], "scan.obj"), dependencies, () => {})).rejects.toMatchObject({ code: "unsupported_format" });
  });

  it("stops at the first failing step and passes its error on (CA4)", async () => {
    const { dependencies } = fakes();
    dependencies.converter.convertUsdz = async () => {
      throw new ModelImportError("no_mesh");
    };

    await expect(importModel(usdzFile(), dependencies, () => {})).rejects.toMatchObject({ code: "no_mesh" });
    expect(dependencies.optimizer.optimize).not.toHaveBeenCalled();
  });
});
