import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Exposition, Work } from "@/lib/api";
import { createdDay, ExpositionSheet } from "./exposition-sheet";

// The server renders in English, the reference dictionary.
const exposition: Exposition = {
  id: "e1",
  artist_id: "a1",
  artist_name: "Rova Rasoanaivo",
  title: "Lumières des Hautes Terres",
  description: "Painter of Highland light and red earth.",
  cover_url: null,
  works_count: 2,
  created_at: "2026-11-03T23:30:00Z",
};
const work = (id: string, over: Partial<Work> = {}): Work => ({
  id,
  artist_id: "a1",
  artist_name: "Rova Rasoanaivo",
  title: `Work ${id}`,
  story: "",
  category: "painting",
  exposition_id: "e1",
  media_url: `http://localhost:8000/media/${id}.jpg`,
  media_kind: "image",
  proof_urls: [],
  sha256: "0".repeat(64),
  human_proven: true,
  ai_declared: false,
  month: "2026-11",
  created_at: "2026-11-05T10:00:00Z",
  votes: 3,
  ...over,
});

const render = (works: Work[], over: Partial<Exposition> = {}, complete = true) =>
  renderToStaticMarkup(<ExpositionSheet exposition={{ ...exposition, ...over }} works={works} complete={complete} />);
/** The value of a line of facts, by its key. */
const fact = (markup: string, key: string) => markup.match(new RegExp(`<dt>${key}</dt><dd>(.*?)</dd>`))?.[1];

describe("ExpositionSheet", () => {
  it("names the exposition in the one h1 and gives the facts of the schema: artist, works, date", () => {
    const html = render([work("w1"), work("w2")]);

    expect(html.match(/<h1[^>]*>(.*?)<\/h1>/)?.[1]).toBe("Lumières des Hautes Terres");
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).toContain("Painter of Highland light and red earth.");
    expect(fact(html, "Artist")).toContain("Rova Rasoanaivo");
    expect(fact(html, "Works")).toBe("2");
    expect(fact(html, "Created on")).toContain("November 3, 2026");
  });

  it("leads back to its artist, and to the artist's room when works hang in it", () => {
    const html = render([work("w1")]);

    expect(html).toContain('href="/artists/a1"');
    expect(html).toContain("Rova Rasoanaivo’s page");
    expect(html).toContain('href="/artists/a1/museum"');
  });

  it("shows each work as a tile that opens its page", () => {
    const html = render([work("w1"), work("w2", { media_kind: "audio" })]);

    expect(html).toContain('href="/works/w1"');
    expect(html).toContain('href="/works/w2"');
    expect(html).toContain("Works on show · 2");
    expect(html).not.toContain("No work hangs");
  });

  it("says an exposition without works is empty, and offers no room to walk", () => {
    const html = render([], { works_count: 0 });

    expect(html).toContain("No work hangs in this exposition yet.");
    expect(html).not.toContain('href="/works/');
    expect(html).not.toContain("/museum");
    expect(html).toContain("Works on show</h2>");
    expect(fact(html, "Works")).toBe("0");
  });

  it("leaves out an empty description", () => {
    expect(render([work("w1")], { description: "" })).not.toContain("<p></p>");
  });

  it("counts nothing itself when the works shown are not all of them, and says how many there are", () => {
    const html = render([work("w1")], { works_count: 1200 }, false);

    expect(html).not.toContain("Works on show · ");
    expect(html).toContain("The 1 most recent works are shown, out of 1200.");
  });

  it("shows nothing the Exposition schema does not have", () => {
    const html = render([work("w1")]).toLowerCase();

    for (const word of ["technique", "dimensions", "provenance", "rights", "curator"]) expect(html).not.toContain(word);
  });
});

describe("createdDay", () => {
  it("reads the date in UTC: 23:30 UTC on the 3rd stays the 3rd", () => {
    expect(createdDay("2026-11-03T23:30:00Z", "en")).toBe("November 3, 2026");
    expect(createdDay("2026-11-03T23:30:00Z", "fr")).toBe("3 novembre 2026");
  });

  it("is empty for a date that cannot be read", () => {
    expect(createdDay("not a date", "en")).toBe("");
  });
});
