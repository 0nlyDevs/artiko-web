import { describe, expect, it, vi } from "vitest";
import { formDataBodySerializer } from "@/lib/api-client/core/bodySerializer.gen";
import { ApiError, type CreateWorkData, type Exposition, type Work } from "@/lib/api";
import { EMPTY_DRAFT, NEW_EXPOSITION, withCreatedExposition, type Draft } from "./draft";
import { submitWork, type PublishApi } from "./submit-work";

const file = new File(["jpg"], "vue-de-face.jpg", { type: "image/jpeg" });
const proofs = [new File(["a"], "esquisse.jpg", { type: "image/jpeg" }), new File(["b"], "geste.mp4", { type: "video/mp4" })];
const draft: Draft = { ...EMPTY_DRAFT, title: "Hautes Terres, fin du jour", category: "painting", story: "Peinte à Antsirabe" };
const exposition = (id: string, title: string) => ({ id, title, description: "", artist_id: "a1", artist_name: "Rova", cover_url: null, works_count: 0, created_at: "2026-11-22T00:00:00Z" }) satisfies Exposition;
const published = { id: "w1", title: draft.title } as Work;

function fakeApi(createWork: PublishApi["createWork"] = async () => published) {
  const bodies: CreateWorkData["body"][] = [];
  const api: PublishApi = {
    createExposition: vi.fn(async ({ title }) => exposition("e9", title)),
    createWork: vi.fn(async (body) => {
      bodies.push(body);
      return createWork(body);
    }),
  };
  return { api, bodies };
}

describe("submitWork", () => {
  it("sends one POST /works with the fields of both steps and no exposition by default", async () => {
    const { api, bodies } = fakeApi();

    const work = await submitWork(api, { draft, file, imported: null, proofs }, () => {});

    expect(work).toBe(published);
    expect(api.createExposition).not.toHaveBeenCalled();
    expect(api.createWork).toHaveBeenCalledTimes(1);
    const form = formDataBodySerializer.bodySerializer(bodies[0]);
    expect([...new Set(form.keys())].sort()).toEqual(["ai_declared", "category", "file", "proof", "proof_claims", "proof_visibility", "story", "title"]);
    expect(form.getAll("proof")).toHaveLength(2);
    expect(JSON.parse(String(form.get("proof_claims")))).toEqual([{ source: "imported" }, { source: "imported" }]);
  });

  it("never declares a work AI-assisted, so the API checks every work", async () => {
    const { api, bodies } = fakeApi();

    await submitWork(api, { draft: { ...draft, aiDeclared: true }, file, imported: null, proofs }, () => {});

    expect(formDataBodySerializer.bodySerializer(bodies[0]).get("ai_declared")).toBe("false");
  });

  it("joins an exposition the artist already has without creating one", async () => {
    const { api, bodies } = fakeApi();

    await submitWork(api, { draft: { ...draft, exposition: "e1" }, file, imported: null, proofs }, () => {});

    expect(api.createExposition).not.toHaveBeenCalled();
    expect(bodies[0].exposition_id).toBe("e1");
  });

  it("creates a new exposition just before the work and sends its id", async () => {
    const { api, bodies } = fakeApi();
    const created: Exposition[] = [];

    await submitWork(
      api,
      { draft: { ...draft, exposition: NEW_EXPOSITION, expositionTitle: " Lumières des Hautes Terres ", expositionDescription: "Huiles de 2026" }, file, imported: null, proofs },
      (e) => created.push(e),
    );

    expect(api.createExposition).toHaveBeenCalledWith({ title: "Lumières des Hautes Terres", description: "Huiles de 2026" });
    expect(created.map((e) => e.id)).toEqual(["e9"]);
    expect(bodies[0].exposition_id).toBe("e9");
  });

  it("does not create the exposition a second time when a refused publication is tried again", async () => {
    let answers = 0;
    const { api, bodies } = fakeApi(async () => {
      if (answers++ === 0) throw new ApiError(409, "duplicate_work", "This exact file is already published");
      return published;
    });
    // What the form does: it remembers the exposition as soon as it exists.
    let current: Draft = { ...draft, exposition: NEW_EXPOSITION, expositionTitle: "Lumières des Hautes Terres" };
    const remember = (created: Exposition) => {
      current = withCreatedExposition(current, created.id);
    };

    await expect(submitWork(api, { draft: current, file, imported: null, proofs }, remember)).rejects.toMatchObject({ code: "duplicate_work" });
    await submitWork(api, { draft: current, file, imported: null, proofs }, remember);

    expect(api.createExposition).toHaveBeenCalledTimes(1);
    expect(api.createWork).toHaveBeenCalledTimes(2);
    expect(bodies.map((body) => body.exposition_id)).toEqual(["e9", "e9"]);
  });

  it("sends nothing to POST /works when the exposition could not be created", async () => {
    const { api } = fakeApi();
    api.createExposition = vi.fn(async () => {
      throw new ApiError(422, "invalid_request", "title too long");
    });

    await expect(submitWork(api, { draft: { ...draft, exposition: NEW_EXPOSITION, expositionTitle: "x" }, file, imported: null, proofs }, () => {})).rejects.toMatchObject({ code: "invalid_request" });

    expect(api.createWork).not.toHaveBeenCalled();
  });
});
