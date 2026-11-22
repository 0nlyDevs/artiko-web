import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@google/model-viewer", () => {
  // model-viewer reads its global config when its module runs.
  globalThis.window.ModelViewerElement = { ...globalThis.window.ModelViewerElement, seenAtDefinition: true } as never;
  return {};
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("loadModelViewer (CA14)", () => {
  it("points model-viewer at the Draco decoder served by artiko-web before defining it", async () => {
    vi.stubGlobal("window", {});
    const { loadModelViewer } = await import("./load-model-viewer");

    await loadModelViewer();

    expect(window.ModelViewerElement).toEqual({ dracoDecoderLocation: "/draco/", seenAtDefinition: true });
  });
});
