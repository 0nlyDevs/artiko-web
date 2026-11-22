import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ModelImportPanel } from "./model-import-panel";
import type { ImportedModel } from "./import-model";

const file = (bytes: number, name: string) => new File([new Uint8Array(bytes)], name);
const ready = (oversized: ImportedModel["oversized"]) => ({
  status: "ready" as const,
  model: { model1k: file(73_172, "a-1k.glb"), model2k: file(147_436, "a-2k.glb"), poster: file(12_916, "a.webp"), oversized },
  preview: { model1k: "blob:1k", model2k: "blob:2k", poster: "blob:poster" },
});

describe("ModelImportPanel", () => {
  it("lists every step with the one in progress (CA6)", () => {
    const html = renderToStaticMarkup(
      <ModelImportPanel state={{ status: "running", steps: ["conversion", "optimization2k", "optimization1k", "poster"], current: "optimization2k" }} alt="" />,
    );

    expect(html).toContain('role="status"');
    expect([...html.matchAll(/<li[^>]*>([^<]*)<\/li>/g)].map((match) => match[1])).toEqual([
      "Converting the scan: done",
      "Optimizing the HD model: in progress",
      "Optimizing the standard model: waiting",
      "Creating the poster image: waiting",
    ]);
    expect(html).toContain('aria-current="step"');
  });

  it("explains why a scan was refused (CA4)", () => {
    const html = renderToStaticMarkup(<ModelImportPanel state={{ status: "failed", code: "unreadable_usdz" }} alt="" />);
    expect(html).toContain('role="alert"');
    expect(html).toContain("Unreadable USDZ file.");
  });

  it("previews the 1K model with HD and poster, and gives the size of each file (CA1)", () => {
    const html = renderToStaticMarkup(<ModelImportPanel state={ready([])} alt="Preview" />);
    // Without WebGL (as under Node) the viewer keeps the poster; the browser test covers the 3D preview.
    expect(html).toContain('<section aria-label="3D viewer"');
    expect(html).toMatch(/<img alt="Preview"[^>]*src="blob:poster"/);
    expect(html).toContain("<dt>Standard model</dt><dd>71.5 kB</dd>");
    expect(html).toContain("<dt>HD model</dt><dd>144 kB</dd>");
    expect(html).toContain("<dt>Poster image</dt><dd>12.6 kB</dd>");
    expect(html).not.toContain('role="alert"');
  });

  it("says which variant is over the 20 MB limit (CA5)", () => {
    const html = renderToStaticMarkup(<ModelImportPanel state={ready(["1k", "2k"])} alt="" />);
    expect(html).toContain("Over the 20 MB limit: Standard model, HD model.");
  });
});
