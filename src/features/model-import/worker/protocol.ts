import type { ModelImportErrorCode } from "@/features/model-import/model-import-error";

export type WorkerRequest =
  | { id: number; kind: "convert"; source: ArrayBuffer }
  | { id: number; kind: "optimize"; glb: ArrayBuffer; textureSize: number }
  | { id: number; kind: "poster"; glb: ArrayBuffer };

export type WorkerResponse =
  | { id: number; ok: true; bytes: ArrayBuffer; mimeType?: string }
  | { id: number; ok: false; code: ModelImportErrorCode; detail: string };
