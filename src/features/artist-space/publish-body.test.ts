import { describe, expect, it } from "vitest";
import { formDataBodySerializer } from "@/lib/api-client/core/bodySerializer.gen";
import type { ImportedModel } from "@/features/model-import/import-model";
import { MAX_PROOFS, proofClaims, publishBody, workFields, type PublishInput, type WorkFields } from "./publish-body";

const fields: WorkFields = {
  title: "Sobika",
  category: "crafts",
  story: "Woven in Ambositra",
  ai_declared: false,
  proof: [new File(["step"], "step1.jpg")],
  proof_visibility: "reviewers",
  exposition_id: "e1",
};

const proofFile = (name: string) => new File([name], name, { type: "image/jpeg" });

const input: PublishInput = {
  title: "Hautes Terres, fin du jour",
  category: "painting",
  story: "Peinte à Antsirabe",
  aiDeclared: false,
  proofs: [proofFile("esquisse.jpg"), proofFile("geste.jpg")],
  visibility: "reviewers",
  expositionId: null,
};

/** The multipart request as the generated client builds it from the body. */
const multipart = (body: ReturnType<typeof publishBody>) => formDataBodySerializer.bodySerializer(body);
const names = (form: FormData) => [...new Set([...form.keys()])].sort();

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

describe("workFields", () => {
  it("names every field as POST /works does, in one multipart request", () => {
    const form = multipart(publishBody(workFields({ ...input, expositionId: "e1" }), proofFile("vue-de-face.jpg"), null));

    expect(names(form)).toEqual(["ai_declared", "category", "exposition_id", "file", "proof", "proof_claims", "proof_visibility", "story", "title"]);
    expect(form.get("title")).toBe("Hautes Terres, fin du jour");
    expect(form.get("category")).toBe("painting");
    expect(form.get("story")).toBe("Peinte à Antsirabe");
    expect(form.get("ai_declared")).toBe("false");
    expect(form.get("proof_visibility")).toBe("reviewers");
    expect(form.get("exposition_id")).toBe("e1");
    expect((form.get("file") as File).name).toBe("vue-de-face.jpg");
  });

  it("repeats proof once per file and sends one imported claim per proof, in the same order", () => {
    const proofs = [proofFile("a.jpg"), proofFile("b.mp4"), proofFile("c.ogg")];

    const form = multipart(publishBody(workFields({ ...input, proofs }), proofFile("work.jpg"), null));

    expect(form.getAll("proof").map((file) => (file as File).name)).toEqual(["a.jpg", "b.mp4", "c.ogg"]);
    expect(JSON.parse(String(form.get("proof_claims")))).toEqual([{ source: "imported" }, { source: "imported" }, { source: "imported" }]);
  });

  it("leaves proof and proof_claims out without any proof", () => {
    const form = multipart(publishBody(workFields({ ...input, proofs: [] }), proofFile("work.jpg"), null));

    expect(form.has("proof")).toBe(false);
    expect(form.has("proof_claims")).toBe(false);
    expect(form.get("proof_visibility")).toBe("reviewers");
  });

  it("sends the visibility the artist chose", () => {
    expect(workFields({ ...input, visibility: "public" }).proof_visibility).toBe("public");
    expect(workFields(input).proof_visibility).toBe("reviewers");
  });

  it("leaves exposition_id out when the work joins no exposition", () => {
    expect(workFields(input)).not.toHaveProperty("exposition_id");
    expect(multipart(publishBody(workFields(input), proofFile("work.jpg"), null)).has("exposition_id")).toBe(false);
    expect(workFields({ ...input, expositionId: "" })).not.toHaveProperty("exposition_id");
  });

  it("declares AI assistance as the API reads it", () => {
    const form = multipart(publishBody(workFields({ ...input, aiDeclared: true }), proofFile("work.jpg"), null));

    expect(form.get("ai_declared")).toBe("true");
  });

  it("never sends more than five proofs, claims included", () => {
    const proofs = Array.from({ length: 7 }, (_, i) => proofFile(`p${i}.jpg`));

    const sent = workFields({ ...input, proofs });

    expect(sent.proof).toHaveLength(MAX_PROOFS);
    expect(JSON.parse(sent.proof_claims ?? "[]")).toHaveLength(MAX_PROOFS);
  });

  it("trims the title and keeps the story as typed", () => {
    const sent = workFields({ ...input, title: "  Sobika  ", story: " line one\nline two " });

    expect(sent.title).toBe("Sobika");
    expect(sent.story).toBe(" line one\nline two ");
  });

  it("keeps the model variants beside the proofs of a 3D scan", () => {
    const imported: ImportedModel = {
      model1k: new File(["1k"], "scan-1k.glb", { type: "model/gltf-binary" }),
      model2k: new File(["2k"], "scan-2k.glb", { type: "model/gltf-binary" }),
      poster: new File(["p"], "scan-poster.webp", { type: "image/webp" }),
      oversized: [],
    };

    const form = multipart(publishBody(workFields(input), new File(["usdz"], "scan.usdz"), imported));

    expect((form.get("file") as File).name).toBe("scan-1k.glb");
    expect((form.get("model_hd") as File).name).toBe("scan-2k.glb");
    expect((form.get("poster") as File).name).toBe("scan-poster.webp");
    expect(form.getAll("proof")).toHaveLength(2);
    expect(JSON.parse(String(form.get("proof_claims")))).toHaveLength(2);
  });
});

describe("proofClaims", () => {
  it("is a JSON list with one imported claim per proof", () => {
    expect(proofClaims(2)).toBe('[{"source":"imported"},{"source":"imported"}]');
    expect(proofClaims(0)).toBe("[]");
  });
});
