import { afterEach, describe, expect, it } from "vitest";
import {
  clearDraft,
  DRAFT_KEY,
  EMPTY_DRAFT,
  forgetFiles,
  NEW_EXPOSITION,
  readDraft,
  rememberedFiles,
  rememberFiles,
  withCreatedExposition,
  withKnownExposition,
  writeDraft,
  type Draft,
} from "./draft";

/** A localStorage with nothing else in it. */
function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
    removeItem: (key: string) => void values.delete(key),
  };
}

const typed: Draft = { ...EMPTY_DRAFT, title: "Hautes Terres, fin du jour", category: "painting", story: "Peinte à Antsirabe", aiDeclared: true, visibility: "public" };

describe("the text draft", () => {
  it("comes back as it was typed", () => {
    const storage = memoryStorage();

    writeDraft(storage, "u1", typed);

    expect(readDraft(storage, "u1")).toEqual(typed);
  });

  it("is never shown to another account on the same browser", () => {
    const storage = memoryStorage();
    writeDraft(storage, "u1", typed);

    expect(readDraft(storage, "u2")).toEqual(EMPTY_DRAFT);
    expect(readDraft(storage, "")).toEqual(EMPTY_DRAFT);
  });

  it("is cleared after a publication", () => {
    const storage = memoryStorage();
    writeDraft(storage, "u1", typed);

    clearDraft(storage);

    expect(storage.values.has(DRAFT_KEY)).toBe(false);
    expect(readDraft(storage, "u1")).toEqual(EMPTY_DRAFT);
  });

  it("leaves nothing behind once the form is empty again", () => {
    const storage = memoryStorage();
    writeDraft(storage, "u1", typed);

    writeDraft(storage, "u1", EMPTY_DRAFT);

    expect(storage.values.has(DRAFT_KEY)).toBe(false);
  });

  it("starts empty from a missing, damaged or blocked storage", () => {
    expect(readDraft(memoryStorage(), "u1")).toEqual(EMPTY_DRAFT);
    expect(readDraft(memoryStorage({ [DRAFT_KEY]: "{not json" }), "u1")).toEqual(EMPTY_DRAFT);
    expect(readDraft(null, "u1")).toEqual(EMPTY_DRAFT);
    const blocked = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("full");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    expect(readDraft(blocked, "u1")).toEqual(EMPTY_DRAFT);
    expect(() => writeDraft(blocked, "u1", typed)).not.toThrow();
    expect(() => clearDraft(blocked)).not.toThrow();
  });

  it("keeps only values the form can hold", () => {
    const storage = memoryStorage({
      [DRAFT_KEY]: JSON.stringify({ owner: "u1", title: "x".repeat(300), category: "cooking", story: 12, aiDeclared: "yes", visibility: "everyone", exposition: 4, expositionTitle: "ignored" }),
    });

    expect(readDraft(storage, "u1")).toEqual({ ...EMPTY_DRAFT, title: "x".repeat(200) });
  });

  it("keeps the title and description of an exposition still to create", () => {
    const storage = memoryStorage();
    const draft: Draft = { ...typed, exposition: NEW_EXPOSITION, expositionTitle: "Lumières des Hautes Terres", expositionDescription: "Huiles de 2026" };

    writeDraft(storage, "u1", draft);

    expect(readDraft(storage, "u1")).toEqual(draft);
  });
});

describe("the exposition of the draft", () => {
  it("points at the exposition just created, so a retry does not create it again", () => {
    const draft: Draft = { ...typed, exposition: NEW_EXPOSITION, expositionTitle: "Lumières", expositionDescription: "2026" };

    expect(withCreatedExposition(draft, "e9")).toEqual({ ...typed, exposition: "e9", expositionTitle: "", expositionDescription: "" });
  });

  it("falls back to none when the saved exposition is no longer the artist's", () => {
    expect(withKnownExposition({ ...typed, exposition: "gone" }, ["e1"]).exposition).toBe("");
    expect(withKnownExposition({ ...typed, exposition: "e1" }, ["e1"]).exposition).toBe("e1");
    expect(withKnownExposition({ ...typed, exposition: NEW_EXPOSITION }, []).exposition).toBe(NEW_EXPOSITION);
  });
});

describe("the files of the draft", () => {
  afterEach(forgetFiles);

  const work = new File(["jpg"], "vue-de-face.jpg", { type: "image/jpeg" });

  it("stay in memory for their owner while the form is away", () => {
    rememberFiles("u1", { work, proofs: [{ id: 1, file: work, problem: null }] });

    expect(rememberedFiles("u1").work).toBe(work);
    expect(rememberedFiles("u1").proofs).toHaveLength(1);
  });

  it("are not handed to another account", () => {
    rememberFiles("u1", { work, proofs: [] });

    expect(rememberedFiles("u2")).toEqual({ work: null, proofs: [] });
  });

  it("are forgotten after a publication", () => {
    rememberFiles("u1", { work, proofs: [] });

    forgetFiles();

    expect(rememberedFiles("u1")).toEqual({ work: null, proofs: [] });
  });
});
