import type { CategoryId, CreateWorkData } from "@/lib/api";
import type { ImportedModel } from "@/features/model-import/import-model";

/** The 1K variant is the main file: the museum and clients unaware of `model_hd` get the light model. */
export function publishBody(form: FormData, imported: ImportedModel | null): CreateWorkData["body"] {
  const base = {
    title: String(form.get("title") ?? ""),
    category: String(form.get("category") ?? "") as CategoryId,
    story: String(form.get("story") ?? ""),
    ai_declared: form.get("ai_declared") === "true",
    proof: form.getAll("proof").filter((p): p is File => p instanceof File && p.size > 0),
  };
  if (imported) return { ...base, file: imported.model1k, model_hd: imported.model2k, poster: imported.poster };
  return { ...base, file: form.get("file") as File };
}
