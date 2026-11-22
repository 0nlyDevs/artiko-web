import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const gallery = join(root, "public", "gallery");
const sources: Record<string, unknown>[] = JSON.parse(readFileSync(join(gallery, "sources.json"), "utf8"));

describe("gallery files", () => {
  it("are each credited with title, artist, date, source and rights", () => {
    for (const source of sources) {
      for (const field of ["file", "title", "artist", "date", "source_url", "rights"]) expect(typeof source[field], `${source.file}.${field}`).toBe("string");
      expect(existsSync(join(gallery, String(source.file))), String(source.file)).toBe(true);
    }
    expect(sources.map((source) => source.file)).toEqual(expect.arrayContaining(["monet.webp", "satie-excerpt.mp3", "satie-waveform.json", "landscape.glb"]));
  });

  it("left public/museum, and no path points there anymore", () => {
    expect(existsSync(join(root, "public", "museum"))).toBe(false);
    const route = join("app", "(app)", "(pages)", "artists", "[id]", "museum") + sep;
    const stale = readdirSync(join(root, "src"), { recursive: true, encoding: "utf8" })
      .filter((file) => /\.(ts|tsx|css)$/.test(file) && !file.startsWith(route))
      .filter((file) => /\/museum\//.test(readFileSync(join(root, "src", file), "utf8")));
    expect(stale).toEqual([]);
  });
});
