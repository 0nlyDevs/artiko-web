import type { ImportedModel, ImportStep } from "./import-model";
import { isModelImportErrorCode, ModelImportError, type ModelImportErrorCode } from "./model-import-error";

export type ImportState =
  | { status: "idle" }
  | { status: "running"; steps: readonly ImportStep[]; current: ImportStep | null }
  | { status: "ready"; model: ImportedModel; preview: PreviewUrls }
  | { status: "failed"; code: ModelImportErrorCode };

export interface PreviewUrls {
  model1k: string;
  model2k: string;
  poster: string;
}

const USDZ_STEPS: readonly ImportStep[] = ["conversion", "optimization2k", "optimization1k", "poster"];
const GLB_STEPS: readonly ImportStep[] = USDZ_STEPS.slice(1);

export function stepsFor(file: File): readonly ImportStep[] {
  return /\.usdz$/i.test(file.name) ? USDZ_STEPS : GLB_STEPS;
}

export function errorCodeOf(error: unknown): ModelImportErrorCode {
  if (error instanceof ModelImportError) return error.code;
  const code = (error as { code?: unknown } | null)?.code;
  return isModelImportErrorCode(code) ? code : "optimization_failed";
}

/** Only a finished import without oversized variants may be published. */
export function canPublish(state: ImportState): boolean {
  return state.status === "ready" && state.model.oversized.length === 0;
}
