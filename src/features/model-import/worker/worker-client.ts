import { ModelImportError } from "@/features/model-import/model-import-error";
import type { ModelConverter, ModelOptimizer, PosterRenderer } from "@/features/model-import/import-model";
import type { WorkerRequest, WorkerResponse } from "./protocol";

type Settled = { bytes: ArrayBuffer; mimeType?: string };
type Pending = { resolve: (result: Settled) => void; reject: (error: unknown) => void };
type RequestBody = WorkerRequest extends infer R ? (R extends WorkerRequest ? Omit<R, "id"> : never) : never;

/** Runs conversion, optimization and poster rendering in a dedicated worker, off the main thread. */
export class ModelImportWorkerClient implements ModelConverter, ModelOptimizer, PosterRenderer {
  private nextId = 0;
  private readonly pending = new Map<number, Pending>();

  constructor(private readonly worker: Worker) {
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => this.settle(event.data);
    worker.onerror = (event) => this.failAll(new ModelImportError("unsupported_browser", event.message));
  }

  async convertUsdz(source: ArrayBuffer): Promise<ArrayBuffer> {
    return (await this.request({ kind: "convert", source }, [source])).bytes;
  }

  async optimize(glb: ArrayBuffer, textureSize: number): Promise<ArrayBuffer> {
    const copy = glb.slice(0);
    return (await this.request({ kind: "optimize", glb: copy, textureSize }, [copy])).bytes;
  }

  async render(glb: ArrayBuffer): Promise<Blob> {
    const copy = glb.slice(0);
    const { bytes, mimeType } = await this.request({ kind: "poster", glb: copy }, [copy]);
    return new Blob([bytes], { type: mimeType });
  }

  dispose(): void {
    this.worker.terminate();
    this.failAll(new ModelImportError("optimization_failed", "worker disposed"));
  }

  private request(body: RequestBody, transfer: Transferable[]): Promise<Settled> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage({ ...body, id } satisfies WorkerRequest, transfer);
    });
  }

  private settle(response: WorkerResponse): void {
    const pending = this.pending.get(response.id);
    if (!pending) return;
    this.pending.delete(response.id);
    if (response.ok) pending.resolve({ bytes: response.bytes, mimeType: response.mimeType });
    else pending.reject(new ModelImportError(response.code, response.detail));
  }

  private failAll(error: ModelImportError): void {
    for (const { reject } of this.pending.values()) reject(error);
    this.pending.clear();
  }
}
