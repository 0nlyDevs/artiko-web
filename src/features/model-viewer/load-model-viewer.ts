import { DRACO_DECODER_PATH } from "@/lib/draco";

declare global {
  interface Window {
    ModelViewerElement?: { dracoDecoderLocation?: string };
  }
}

let definition: Promise<void> | undefined;

async function defineModelViewer(): Promise<void> {
  // Read once by model-viewer when it is defined; replaces its www.gstatic.com default
  // (@google/model-viewer/lib/features/loading.js:244-249).
  window.ModelViewerElement = { ...window.ModelViewerElement, dracoDecoderLocation: DRACO_DECODER_PATH };
  await import("@google/model-viewer");
}

export function loadModelViewer(): Promise<void> {
  definition ??= defineModelViewer().catch((error: unknown) => {
    definition = undefined;
    throw error;
  });
  return definition;
}
