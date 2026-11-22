import type { CategoryId, CreateWorkData } from "@/lib/api";
import type { ImportedModel } from "@/features/model-import/import-model";

type CreateWorkBody = CreateWorkData["body"];
export type WorkFields = Omit<CreateWorkBody, "file" | "model_hd" | "poster">;
export type ProofVisibility = NonNullable<CreateWorkBody["proof_visibility"]>;

/** The API refuses a sixth proof file (400 `too_many_proofs`). */
export const MAX_PROOFS = 5;

/** What the artist filled in over the two steps, before it is named as the API names it. */
export interface PublishInput {
  title: string;
  category: CategoryId;
  story: string;
  aiDeclared: boolean;
  /** The proof files to send, in the order shown. */
  proofs: readonly File[];
  visibility: ProofVisibility;
  /** One of the artist's expositions, or null for none. */
  expositionId: string | null;
}

/**
 * `proof_claims`: one claim per proof file, in the same order. A browser can only send files the artist
 * picked, so every claim is `imported`; signed in-app captures belong to the Android application.
 */
export function proofClaims(count: number): string {
  return JSON.stringify(Array.from({ length: count }, () => ({ source: "imported" })));
}

/**
 * The text fields and proofs of `POST /works`, under the API's exact names. `proof_claims` goes with the
 * proofs and is left out without any; `exposition_id` is left out when the work joins no exposition.
 */
export function workFields(input: PublishInput): WorkFields {
  const proof = input.proofs.slice(0, MAX_PROOFS);
  return {
    title: input.title.trim(),
    category: input.category,
    story: input.story,
    ai_declared: input.aiDeclared,
    proof,
    ...(proof.length > 0 && { proof_claims: proofClaims(proof.length) }),
    proof_visibility: input.visibility,
    ...(input.expositionId && { exposition_id: input.expositionId }),
  };
}

/** The 1K variant is the main file: the museum and clients unaware of `model_hd` get the light model. */
export function publishBody(fields: WorkFields, file: File, imported: ImportedModel | null): CreateWorkBody {
  if (imported) return { ...fields, file: imported.model1k, model_hd: imported.model2k, poster: imported.poster };
  return { ...fields, file };
}
