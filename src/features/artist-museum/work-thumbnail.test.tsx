import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Work } from "@/lib/api";
import { WorkThumbnail } from "./museum-view";

const work = (overrides: Partial<Work>): Work => ({
  id: "w1",
  artist_id: "a1",
  artist_name: "Rova",
  title: "Sobika",
  story: "",
  category: "crafts",
  media_url: "http://localhost:8000/media/w1.glb",
  media_kind: "model",
  proof_urls: [],
  sha256: "0".repeat(64),
  ...overrides,
}) as Work;

describe("WorkThumbnail (CA15)", () => {
  it("shows the poster of a 3D work in the 2D mode", () => {
    const html = renderToStaticMarkup(<WorkThumbnail work={work({ poster_url: "http://localhost:8000/media/w1.webp" })} />);
    expect(html).toContain("w1.webp");
    expect(html).not.toContain("w1.glb");
  });

  it("shows an image work itself and nothing for a 3D work without poster", () => {
    expect(renderToStaticMarkup(<WorkThumbnail work={work({ media_kind: "image", media_url: "http://localhost:8000/media/p.jpg" })} />)).toContain("p.jpg");
    expect(renderToStaticMarkup(<WorkThumbnail work={work({ poster_url: null })} />)).toBe("");
  });
});
