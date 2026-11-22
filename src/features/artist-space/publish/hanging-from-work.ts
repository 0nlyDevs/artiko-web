import type { CategoryId, Work } from "@/lib/api";
import type { HangingSources, HangingStand } from "@/kanto/features/hanging/hanging-content";
import type { HangingStageWall } from "@/kanto/features/hanging/HangingStage";

// How a published Work drives the hanging ceremony of the museum (src/kanto/features/hanging). Only fields
// the API returns are read: the kind of its file and the addresses of that file.

/** A plinth for a 3D model, the picture rail for an image, a wall label for a sound or a video. */
export function workStand(work: Pick<Work, "media_kind">): HangingStand {
  if (work.media_kind === "model") return "plinth";
  return work.media_kind === "image" ? "rail" : "label";
}

/** What comes down: the light model with its poster as a fallback, the image itself, or nothing to draw. */
export function workSources(work: Pick<Work, "media_kind" | "media_url" | "poster_url">): HangingSources {
  if (work.media_kind === "model") return { model: work.media_url, images: work.poster_url ? [work.poster_url] : [] };
  if (work.media_kind === "image") return { model: null, images: [work.media_url] };
  return { model: null, images: [] };
}

// The wall tones of the museum rooms (src/kanto/features/gallery/data/rooms.ts), spread over the eight art
// forms of the API. The painting room is the photographed red room.
const WALLS: Record<CategoryId, HangingStageWall> = {
  painting: { tone: "red", photo: true },
  sculpture: { tone: "stone", photo: false },
  photography: { tone: "stone", photo: false },
  crafts: { tone: "ochre", photo: false },
  music: { tone: "indigo", photo: false },
  dance: { tone: "indigo", photo: false },
  oral_arts: { tone: "ochre", photo: false },
  digital: { tone: "indigo", photo: false },
};

export function workWall(category: string): HangingStageWall {
  return WALLS[category as CategoryId] ?? { tone: "stone", photo: false };
}
