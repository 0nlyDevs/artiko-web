export type ModelImportErrorCode =
  | "unsupported_format"
  | "source_too_large"
  | "unreadable_usdz"
  | "no_mesh"
  | "external_reference"
  | "unreadable_texture"
  | "unsupported_browser"
  | "optimization_failed"
  | "poster_failed";

export class ModelImportError extends Error {
  constructor(
    readonly code: ModelImportErrorCode,
    detail?: string,
  ) {
    super(detail ? `${code}: ${detail}` : code);
    this.name = "ModelImportError";
  }
}

export function isModelImportErrorCode(value: unknown): value is ModelImportErrorCode {
  return typeof value === "string" && MODEL_IMPORT_ERROR_CODES.includes(value as ModelImportErrorCode);
}

const MODEL_IMPORT_ERROR_CODES: readonly ModelImportErrorCode[] = [
  "unsupported_format",
  "source_too_large",
  "unreadable_usdz",
  "no_mesh",
  "external_reference",
  "unreadable_texture",
  "unsupported_browser",
  "optimization_failed",
  "poster_failed",
];
