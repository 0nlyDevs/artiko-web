import type { ModelImportDependencies } from "./import-model";
import { ModelImportError } from "./model-import-error";
import { ModelImportWorkerClient } from "./worker/worker-client";

export type DisposableModelImport = ModelImportDependencies & { dispose(): void };

export function supportsModelImport(): boolean {
  return typeof Worker !== "undefined" && typeof WebAssembly !== "undefined" && typeof OffscreenCanvas !== "undefined";
}

export function createModelImport(): DisposableModelImport {
  if (!supportsModelImport()) throw new ModelImportError("unsupported_browser");
  const client = new ModelImportWorkerClient(
    new Worker(new URL("./worker/model-import.worker.ts", import.meta.url), { type: "module" }),
  );
  return { converter: client, optimizer: client, posterRenderer: client, dispose: () => client.dispose() };
}
