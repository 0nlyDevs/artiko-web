import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ArtworkViewerFrame, type ArtworkModel } from "./artwork-viewer";
import { initialViewerState, type ViewerState } from "./viewer-state";

const model: ArtworkModel = { model1k: "/media/a-1k.glb", model2k: "/media/a-2k.glb", poster: "/media/a.webp", alt: "Sobika" };
const noop = () => {};

function render(state: ViewerState, overrides: Partial<{ webGLAvailable: boolean; model: ArtworkModel }> = {}) {
  return renderToStaticMarkup(
    <ArtworkViewerFrame
      model={overrides.model ?? model}
      state={state}
      webGLAvailable={overrides.webGLAvailable ?? true}
      showView={noop}
      toggleHd={noop}
      retry={noop}
    />,
  );
}

describe("ArtworkViewerFrame", () => {
  it("shows the 1K model with its poster, orbit stopped at the horizon, five views and HD (CA10)", () => {
    const html = render(initialViewerState(true));

    expect(html).toContain('src="/media/a-1k.glb" poster="/media/a.webp" alt="Sobika"');
    expect(html).toContain('camera-controls=""');
    expect(html).toContain('max-camera-orbit="auto 90deg auto"');
    expect([...html.matchAll(/<button[^>]*>([^<]*)<\/button>/g)].map((match) => match[1])).toEqual(["Front", "Back", "Left", "Right", "Top", "HD"]);
    expect(html).toContain("Loading the 3D model…");
  });

  it("loads the 2K model in HD and hides HD once it is unavailable (CA11)", () => {
    expect(render({ ...initialViewerState(true), quality: "hd" })).toContain('src="/media/a-2k.glb"');
    const fallback = render({ ...initialViewerState(true), status: "ready", hdAvailable: false, hdFailed: true });
    expect(fallback).toContain('src="/media/a-1k.glb"');
    expect(fallback).not.toContain(">HD<");
    expect(fallback).toContain("The HD version is not available");
  });

  it("keeps the poster with a retry after a failed 1K load, and reloads under a new URL (CA12)", () => {
    const failed = render({ ...initialViewerState(true), status: "error" });
    expect(failed).not.toContain("<model-viewer");
    expect(failed).toMatch(/<img[^>]*alt="Sobika"[^>]*src="\/media\/a.webp"/);
    expect(failed).toContain(">Retry</button>");

    expect(render({ ...initialViewerState(true), attempt: 1 })).toContain('src="/media/a-1k.glb#retry-1"');
  });

  it("shows the poster and a short message without WebGL, and no model (CA13)", () => {
    const html = render(initialViewerState(true), { webGLAvailable: false });
    expect(html).not.toContain("<model-viewer");
    expect(html).not.toContain("<button");
    expect(html).toMatch(/<img[^>]*src="\/media\/a.webp"/);
    expect(html).toContain("3D is not available on this device.");
  });

  it("names the work as a 3D work without WebGL and without a poster (CA13)", () => {
    const html = render(initialViewerState(false), { webGLAvailable: false, model: { ...model, poster: null } });
    expect(html).not.toContain("<img");
    expect(html).toContain("3D work");
  });
});
