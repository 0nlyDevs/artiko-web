import type { CreateWorkData } from "@/lib/api";
import type { ImportedModel } from "@/features/model-import/import-model";

type CreateWorkBody = CreateWorkData["body"];
export type WorkFields = Omit<CreateWorkBody, "file" | "model_hd" | "poster">;

/** The 1K variant is the main file: the museum and clients unaware of `model_hd` get the light model. */
export function publishBody(fields: WorkFields, file: File, imported: ImportedModel | null): CreateWorkBody {
  if (imported) return { ...fields, file: imported.model1k, model_hd: imported.model2k, poster: imported.poster };
  return { ...fields, file };
}
