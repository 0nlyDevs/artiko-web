import { describe, expect, it } from "vitest";
import { initialViewerState, statusMessageKey, viewerReducer, type ViewerAction, type ViewerState } from "./viewer-state";

const run = (state: ViewerState, ...actions: ViewerAction["type"][]) =>
  actions.reduce((current, type) => viewerReducer(current, { type } as ViewerAction), state);

describe("viewerReducer", () => {
  it("starts on the 1K model, loading (CA10)", () => {
    const state = initialViewerState(true);
    expect(state).toEqual({ status: "loading", quality: "standard", hdAvailable: true, hdFailed: false, attempt: 0 });
    expect(statusMessageKey(state)).toBe("viewer.loading");
    expect(statusMessageKey(run(state, "loaded"))).toBeNull();
  });

  it("loads the 2K model with HD and goes back to 1K with a second press (CA11)", () => {
    const hd = run(initialViewerState(true), "loaded", "toggleHd");
    expect(hd).toMatchObject({ status: "loading", quality: "hd" });
    expect(statusMessageKey(hd)).toBe("viewer.loadingHd");
    expect(run(hd, "loaded", "toggleHd")).toMatchObject({ quality: "standard" });
  });

  it("ignores HD without a 2K model", () => {
    const state = run(initialViewerState(false), "loaded");
    expect(run(state, "toggleHd")).toBe(state);
  });

  it("falls back to 1K and drops HD for good when the 2K model fails or the WebGL context is lost (CA11)", () => {
    const fallback = run(initialViewerState(true), "loaded", "toggleHd", "failed");
    expect(fallback).toMatchObject({ status: "loading", quality: "standard", hdAvailable: false, hdFailed: true });
    expect(statusMessageKey(run(fallback, "loaded"))).toBe("viewer.hdUnavailable");
    expect(run(fallback, "loaded", "toggleHd")).toMatchObject({ quality: "standard" });
  });

  it("shows an error when the 1K model fails, and a retry starts a new attempt (CA12)", () => {
    const failed = run(initialViewerState(true), "failed");
    expect(failed.status).toBe("error");
    expect(statusMessageKey(failed)).toBe("viewer.failed");
    expect(run(failed, "retry")).toMatchObject({ status: "loading", quality: "standard", attempt: 1 });
  });
});
