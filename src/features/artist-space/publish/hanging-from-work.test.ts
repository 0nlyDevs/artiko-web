import { describe, expect, it } from "vitest";
import { workSources, workStand, workWall } from "./hanging-from-work";

const image = { media_kind: "image", media_url: "https://api.test/media/a.jpg", poster_url: null } as const;
const model = { media_kind: "model", media_url: "https://api.test/media/a.glb", poster_url: "https://api.test/media/a.webp" } as const;

describe("the hanging ceremony of a published work", () => {
  it("hangs an image on the picture rail, from the address the API returned", () => {
    expect(workStand(image)).toBe("rail");
    expect(workSources(image)).toEqual({ model: null, images: ["https://api.test/media/a.jpg"] });
  });

  it("stands a 3D model on the plinth, with its poster as a fallback", () => {
    expect(workStand(model)).toBe("plinth");
    expect(workSources(model)).toEqual({ model: "https://api.test/media/a.glb", images: ["https://api.test/media/a.webp"] });
    expect(workSources({ ...model, poster_url: null }).images).toEqual([]);
  });

  it("drops the wall label for a sound or a video, which have no picture", () => {
    for (const media_kind of ["audio", "video"] as const) {
      expect(workStand({ media_kind })).toBe("label");
      expect(workSources({ media_kind, media_url: "https://api.test/media/a", poster_url: null })).toEqual({ model: null, images: [] });
    }
  });

  it("gives every art form of the API a wall, the red room to painting", () => {
    expect(workWall("painting")).toEqual({ tone: "red", photo: true });
    for (const category of ["sculpture", "photography", "music", "dance", "oral_arts", "crafts", "digital"]) {
      expect(workWall(category).photo).toBe(false);
    }
    expect(workWall("something new")).toEqual({ tone: "stone", photo: false });
  });
});
