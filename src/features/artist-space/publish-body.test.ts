import { describe, expect, it } from "vitest";
import type { ImportedModel } from "@/features/model-import/import-model";
import { publishBody } from "./publish-body";

function form(file: File) {
  const data = new FormData();
  data.set("title", "Sobika");
  data.set("category", "crafts");
  data.set("story", "Woven in Ambositra");
  data.set("file", file);
  data.append("proof", new File(["step"], "step1.jpg"));
  data.append("proof", new File([], ""));
  return data;
}

describe("publishBody", () => {
  it("sends the 1K variant as file, the 2K variant as model_hd and the poster (CA3)", () => {
    const imported: ImportedModel = {
      model1k: new File(["1k"], "scan-1k.glb"),
      model2k: new File(["2k"], "scan-2k.glb"),
      poster: new File(["p"], "scan-poster.webp"),
      oversized: [],
    };

    const body = publishBody(form(new File(["usdz"], "scan.usdz")), imported);

    expect(body.file).toBe(imported.model1k);
    expect(body.model_hd).toBe(imported.model2k);
    expect(body.poster).toBe(imported.poster);
    expect(body).toMatchObject({ title: "Sobika", category: "crafts", story: "Woven in Ambositra", ai_declared: false });
    expect(body.proof).toHaveLength(1);
  });

  it("sends the chosen file alone for an image, a sound or a video", () => {
    const image = new File(["jpg"], "painting.jpg");

    const body = publishBody(form(image), null);

    expect(body.file).toBe(image);
    expect(body).not.toHaveProperty("model_hd");
    expect(body).not.toHaveProperty("poster");
  });
});
