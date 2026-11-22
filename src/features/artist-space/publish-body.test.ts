import { describe, expect, it } from "vitest";
import type { ImportedModel } from "@/features/model-import/import-model";
import { publishBody, type WorkFields } from "./publish-body";

const fields: WorkFields = {
  title: "Sobika",
  category: "crafts",
  story: "Woven in Ambositra",
  ai_declared: false,
  proof: [new File(["step"], "step1.jpg")],
  proof_visibility: "reviewers",
  exposition_id: "e1",
};

describe("publishBody", () => {
  it("sends the 1K variant as file, the 2K variant as model_hd and the poster (CA3)", () => {
    const imported: ImportedModel = {
      model1k: new File(["1k"], "scan-1k.glb"),
      model2k: new File(["2k"], "scan-2k.glb"),
      poster: new File(["p"], "scan-poster.webp"),
      oversized: [],
    };

    const body = publishBody(fields, new File(["usdz"], "scan.usdz"), imported);

    expect(body.file).toBe(imported.model1k);
    expect(body.model_hd).toBe(imported.model2k);
    expect(body.poster).toBe(imported.poster);
    expect(body).toMatchObject(fields);
  });

  it("sends the chosen file alone for an image, a sound or a video", () => {
    const image = new File(["jpg"], "painting.jpg");

    const body = publishBody(fields, image, null);

    expect(body.file).toBe(image);
    expect(body).toMatchObject(fields);
    expect(body).not.toHaveProperty("model_hd");
    expect(body).not.toHaveProperty("poster");
  });
});
