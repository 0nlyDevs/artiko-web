import type { Key } from "@/i18n/en";

export type ViewerStatus = "loading" | "ready" | "error";
export type ModelQuality = "standard" | "hd";

export interface ViewerState {
  status: ViewerStatus;
  quality: ModelQuality;
  hdAvailable: boolean;
  hdFailed: boolean;
  attempt: number;
}

export type ViewerAction = { type: "loaded" } | { type: "failed" } | { type: "toggleHd" } | { type: "retry" };

export function initialViewerState(hdAvailable: boolean): ViewerState {
  return { status: "loading", quality: "standard", hdAvailable, hdFailed: false, attempt: 0 };
}

export function viewerReducer(state: ViewerState, action: ViewerAction): ViewerState {
  switch (action.type) {
    case "loaded":
      return { ...state, status: "ready" };
    case "failed":
      // A failed or lost 2K load falls back to 1K for good: retrying HD on a weak device would fail again.
      if (state.quality === "hd") {
        return { ...state, status: "loading", quality: "standard", hdAvailable: false, hdFailed: true };
      }
      return { ...state, status: "error" };
    case "toggleHd":
      if (!state.hdAvailable) return state;
      return { ...state, status: "loading", quality: state.quality === "hd" ? "standard" : "hd" };
    case "retry":
      return { ...state, status: "loading", quality: "standard", attempt: state.attempt + 1 };
  }
}

export function statusMessageKey(state: ViewerState): Key | null {
  if (state.status === "error") return "viewer.failed";
  if (state.status === "loading") return state.quality === "hd" ? "viewer.loadingHd" : "viewer.loading";
  return state.hdFailed ? "viewer.hdUnavailable" : null;
}
