import type { CategoryId } from "@/lib/api";
import type { ProofVisibility } from "@/features/artist-space/publish-body";
import type { ProofItem } from "./file-checks";

/** The exposition setting: none, one of the artist's own by id, or a new one created at publication. */
export const NO_EXPOSITION = "";
export const NEW_EXPOSITION = "__new";

/** Everything typed in the two steps. Text only: it is what the browser keeps between visits. */
export interface Draft {
  title: string;
  category: CategoryId | "";
  story: string;
  aiDeclared: boolean;
  visibility: ProofVisibility;
  /** `NO_EXPOSITION`, `NEW_EXPOSITION` or the id of an exposition. */
  exposition: string;
  expositionTitle: string;
  expositionDescription: string;
}

export const EMPTY_DRAFT: Draft = {
  title: "",
  category: "",
  story: "",
  aiDeclared: false,
  // The API's own default: the proofs stay private.
  visibility: "reviewers",
  exposition: NO_EXPOSITION,
  expositionTitle: "",
  expositionDescription: "",
};

const CATEGORIES: readonly string[] = ["painting", "sculpture", "photography", "music", "dance", "oral_arts", "crafts", "digital"];

/** One draft per browser, tagged with its owner so the next account on this browser never reads it. */
export const DRAFT_KEY = "kanto.publish.draft";

type Stored = Partial<Record<keyof Draft, unknown>> & { owner?: unknown };

const text = (value: unknown, max: number): string => (typeof value === "string" ? value.slice(0, max) : "");

/** The saved draft of `owner`, or an empty one: storage may be blocked, empty, another account's or damaged. */
export function readDraft(storage: Pick<Storage, "getItem"> | null, owner: string): Draft {
  if (!storage || !owner) return EMPTY_DRAFT;
  try {
    const saved = JSON.parse(storage.getItem(DRAFT_KEY) ?? "null") as Stored | null;
    if (!saved || typeof saved !== "object" || saved.owner !== owner) return EMPTY_DRAFT;
    const exposition = text(saved.exposition, 64);
    return {
      title: text(saved.title, 200),
      category: CATEGORIES.includes(saved.category as string) ? (saved.category as CategoryId) : "",
      story: text(saved.story, 5000),
      aiDeclared: saved.aiDeclared === true,
      visibility: saved.visibility === "public" ? "public" : "reviewers",
      exposition,
      expositionTitle: exposition === NEW_EXPOSITION ? text(saved.expositionTitle, 200) : "",
      expositionDescription: exposition === NEW_EXPOSITION ? text(saved.expositionDescription, 2000) : "",
    };
  } catch {
    return EMPTY_DRAFT;
  }
}

export const isEmptyDraft = (draft: Draft): boolean => (Object.keys(EMPTY_DRAFT) as (keyof Draft)[]).every((key) => draft[key] === EMPTY_DRAFT[key]);

/** Saves the draft, or removes it once it is empty again. A full or blocked storage loses the draft, never the form. */
export function writeDraft(storage: Pick<Storage, "setItem" | "removeItem"> | null, owner: string, draft: Draft): void {
  if (!storage || !owner) return;
  try {
    if (isEmptyDraft(draft)) storage.removeItem(DRAFT_KEY);
    else storage.setItem(DRAFT_KEY, JSON.stringify({ owner, ...draft }));
  } catch {
    // The form still holds what was typed.
  }
}

export function clearDraft(storage: Pick<Storage, "removeItem"> | null): void {
  try {
    storage?.removeItem(DRAFT_KEY);
  } catch {
    // Nothing to clear in a blocked storage.
  }
}

/** The browser's storage, or null where there is none (server render, blocked storage). */
export function draftStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** A draft pointing at a new exposition now points at the one just created: a retry reuses it instead of creating a second one. */
export function withCreatedExposition(draft: Draft, expositionId: string): Draft {
  return { ...draft, exposition: expositionId, expositionTitle: "", expositionDescription: "" };
}

/** A saved choice of exposition that the artist no longer has falls back to none. */
export function withKnownExposition(draft: Draft, known: readonly string[]): Draft {
  if (draft.exposition === NO_EXPOSITION || draft.exposition === NEW_EXPOSITION || known.includes(draft.exposition)) return draft;
  return { ...draft, exposition: NO_EXPOSITION };
}

// The files of the draft. A file cannot go into localStorage, so they live in memory: they survive a change
// of tab in My space (the form unmounts there) and are gone after a reload, where the text draft remains.
export interface DraftFiles {
  work: File | null;
  proofs: ProofItem[];
}

let files: { owner: string } & DraftFiles = { owner: "", work: null, proofs: [] };

export function rememberedFiles(owner: string): DraftFiles {
  return owner && files.owner === owner ? { work: files.work, proofs: files.proofs } : { work: null, proofs: [] };
}

export function rememberFiles(owner: string, kept: DraftFiles): void {
  files = { owner, ...kept };
}

export function forgetFiles(): void {
  files = { owner: "", work: null, proofs: [] };
}
