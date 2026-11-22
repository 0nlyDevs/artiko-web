import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Artist, Exposition, Practice, Work } from "@/lib/api";
import { ArtistProfile, type HallPlace } from "./artist-profile";

// The server renders in English, the reference dictionary.
const artist: Artist = { id: "a1", display_name: "Rova Rasoanaivo", bio: "Painter of Highland light.", region: "Antananarivo" };
const work = (id: string, over: Partial<Work> = {}): Work => ({
  id,
  artist_id: "a1",
  artist_name: "Rova Rasoanaivo",
  title: `Work ${id}`,
  story: "",
  category: "painting",
  exposition_id: null,
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
const exposition: Exposition = {
  id: "e1",
  artist_id: "a1",
  artist_name: "Rova Rasoanaivo",
  title: "Lumières des Hautes Terres",
  description: "",
  cover_url: "http://localhost:8000/media/cover.jpg",
  works_count: 1,
  created_at: "2026-11-03T09:00:00Z",
};
const practice: Practice = { id: "p1", name: "Zafimaniry carving", region: "Ambositra", category: "sculpture", practitioners: 40, learners: 10, median_age: 61, status: "red", description: "" };
const WORKS = [work("w1", { votes: 14, exposition_id: "e1" }), work("w2", { votes: 4, human_proven: false, category: "digital" }), work("w3", { votes: 0, media_kind: "audio" })];

type Props = Parameters<typeof ArtistProfile>[0];
const render = (over: Partial<Props> = {}) =>
  renderToStaticMarkup(<ArtistProfile artist={artist} works={WORKS} expositions={[exposition]} places={[]} others={[]} practices={[]} {...over} />);
/** The value of a counter of the header, by its label. */
const stat = (markup: string, label: string) => markup.match(new RegExp(`<dt>${label}</dt><dd>(.*?)</dd>`))?.[1];

describe("ArtistProfile", () => {
  it("names the artist in the one h1, with the region, the art forms and the bio", () => {
    const html = render();

    expect(html.match(/<h1[^>]*>(.*?)<\/h1>/)?.[1]).toBe("Rova Rasoanaivo");
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).toContain("Artist · Antananarivo");
    expect(html).toContain("Painting · Digital art");
    expect(html).toContain("Painter of Highland light.");
  });

  it("counts works, votes, expositions and proven works when the list of works is whole", () => {
    const html = render();

    expect(stat(html, "Works")).toBe("3");
    expect(stat(html, "Votes")).toBe("18");
    expect(stat(html, "Expositions")).toBe("1");
    expect(html).toContain("2 of 3 works carry a proof of creation");
    expect(html).toContain(">3 works</p>");
    expect(html).not.toContain("without counts");
  });

  it("shows no count of works when the list was cut, and says why; expositions stay counted", () => {
    const html = render({ worksComplete: false });

    expect(stat(html, "Works")).toBeUndefined();
    expect(stat(html, "Votes")).toBeUndefined();
    expect(stat(html, "Expositions")).toBe("1");
    expect(html).not.toContain("carry a proof of creation");
    expect(html).not.toContain(">3 works</p>");
    expect(html).toContain("the most recent are shown, without counts");
    // The works themselves are still there.
    expect(html).toContain('href="/works/w1"');
  });

  it("opens each work on its page, and says its votes to everyone", () => {
    const html = render();

    for (const id of ["w1", "w2", "w3"]) expect(html).toContain(`href="/works/${id}"`);
    expect(html).toContain("14 votes");
    // A sound has no picture: its tile names it.
    expect(html).toContain("Sound");
    expect(html).toContain("Work w3");
  });

  it("offers the 3D room only to an artist with works, and always the share button", () => {
    expect(render()).toContain('href="/artists/a1/museum"');

    const empty = render({ works: [], expositions: [] });
    expect(empty).not.toContain("/museum");
    expect(empty).toContain("Share the museum");
    expect(empty).toContain("This museum is still empty");
    expect(stat(empty, "Works")).toBe("0");
  });

  it("lists the expositions as pressable pictures, « All » first and pressed", () => {
    const html = render();

    expect(html).toMatch(/<button type="button" aria-pressed="true"[^>]*>.*?All<\/span><\/button>/);
    expect(html).toMatch(/<button type="button" aria-pressed="false"[^>]*>.*?Lumières des Hautes Terres<\/span><\/button>/);
    expect(html).toContain("cover.jpg");
    expect(render({ expositions: [] })).not.toContain('aria-label="Expositions"');
  });

  it("keeps the two arrangements as tabs, « By exposition » selected", () => {
    const html = render();

    expect(html).toMatch(/role="tab" aria-selected="true"[^>]*>By exposition</);
    expect(html).toMatch(/role="tab" aria-selected="false"[^>]*>By art form</);
  });

  it("shows the places in the Hall of Fame, the other museums and the living heritage, each only when there is one", () => {
    const places: HallPlace[] = [{ rank: 2, work: WORKS[0], votes: 14 }];
    const html = render({ places, others: [{ id: "a2", display_name: "Hery Andrianina", bio: "", region: "Ambositra" }], practices: [practice] });

    expect(html).toContain("In the Hall of Fame");
    expect(html).toContain("No. 2");
    expect(html).toContain("Work w1, 14 votes");
    expect(html).toContain('href="/artists/a2"');
    expect(html).toContain("Hery Andrianina");
    expect(html).toContain('href="/heritage"');
    expect(html).toContain("Zafimaniry carving");
    expect(html).toContain("Endangered");

    const bare = render();
    for (const title of ["In the Hall of Fame", "Other museums", "Living heritage"]) expect(bare).not.toContain(title);
  });
});
