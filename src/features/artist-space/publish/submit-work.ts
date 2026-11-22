import type { CreateWorkData, Exposition, ExpositionIn, Work } from "@/lib/api";
import type { ImportedModel } from "@/features/model-import/import-model";
import { publishBody, workFields, type PublishInput } from "@/features/artist-space/publish-body";
import { NEW_EXPOSITION, NO_EXPOSITION, type Draft } from "./draft";

/** The two writes of a publication, each run as the signed-in artist. */
export interface PublishApi {
  createExposition: (body: ExpositionIn) => Promise<Exposition>;
  createWork: (body: CreateWorkData["body"]) => Promise<Work>;
}

export interface Submission {
  draft: Draft;
  file: File;
  /** The prepared variants of a 3D scan, or null for an image, a sound or a video. */
  imported: ImportedModel | null;
  proofs: readonly File[];
}

/**
 * Publishes the work: one multipart `POST /works`. A new exposition is created just before, at the click on
 * « Publier » and never earlier, since an exposition can be neither edited nor deleted. `onExposition` runs as
 * soon as it exists, before the work is sent: the caller remembers it, so a refused publication tried again
 * joins the same exposition instead of creating a second one.
 */
export async function submitWork(api: PublishApi, { draft, file, imported, proofs }: Submission, onExposition: (created: Exposition) => void): Promise<Work> {
  let expositionId: string | null = draft.exposition === NO_EXPOSITION || draft.exposition === NEW_EXPOSITION ? null : draft.exposition;
  if (draft.exposition === NEW_EXPOSITION) {
    const created = await api.createExposition({ title: draft.expositionTitle.trim(), description: draft.expositionDescription.trim() });
    onExposition(created);
    expositionId = created.id;
  }
  const input: PublishInput = {
    title: draft.title,
    // The first step does not let an empty art form through.
    category: draft.category as PublishInput["category"],
    story: draft.story,
    aiDeclared: draft.aiDeclared,
    proofs,
    visibility: draft.visibility,
    expositionId,
  };
  return api.createWork(publishBody(workFields(input), file, imported));
}
