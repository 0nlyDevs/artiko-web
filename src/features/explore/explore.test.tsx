import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Artist, Category, Work } from "@/lib/api";
import { MAX_ITEMS } from "@/lib/paging";
import { emptyKey, exploreHref, mayBeCut, readFilters, SEARCH_POOL, type ExploreFilters as Filters } from "./explore-logic";

// The filters move the address through the app router, which a test has no instance of.
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));

const { ExploreCategories } = await import("./explore-categories");
const { ExploreFilters } = await import("./explore-filters");
const { ArtistsList, ArtistsRow, ExploreHead, WorksFeed } = await import("./explore-sections");

// The server renders in English, the reference dictionary.
const html = renderToStaticMarkup;
/** The addresses of the links, as a browser reads them (the markup writes `&` as `&amp;`). */
const hrefs = (markup: string) => [...markup.matchAll(/<a[^>]*href="([^"]*)"/g)].map((m) => m[1].replaceAll("&amp;", "&"));
const links = (markup: string) => markup.match(/<a[^>]*>.*?<\/a>/g) ?? [];

const CATEGORIES = [
  { id: "painting", label: "Painting" },
  { id: "music", label: "Music" },
] as Category[];
const MONTHS = ["2026-11", "2026-10", "2026-09"];
const ALL: Filters = { q: "", view: "works" };

const work = (id: string, overrides: Partial<Work> = {}): Work =>
  ({ id, artist_id: "a1", artist_name: "Rova Rasoanaivo", title: `Title ${id}`, story: "", category: "painting", media_url: `http://localhost:8000/media/${id}.jpg`, media_kind: "image", proof_urls: [], sha256: "0".repeat(64), human_proven: true, ai_declared: false, month: "2026-11", created_at: "2026-11-02T08:00:00Z", votes: 3, ...overrides }) as Work;
const artist = (id: string, overrides: Partial<Artist> = {}): Artist => ({ id, display_name: `Artist ${id}`, region: "Analamanga", bio: "Painter of red earth.", ...overrides });

describe("the address of Explore", () => {
  it("keeps the set filters only, in one order, and leaves the feed of works out of it", () => {
    expect(exploreHref({})).toBe("/explore");
    expect(exploreHref({ q: "", month: undefined, view: "works" })).toBe("/explore");
    expect(exploreHref({ q: "rova earth", month: "2026-11", category: "painting" })).toBe("/explore?category=painting&month=2026-11&q=rova+earth");
    expect(exploreHref({ view: "artists", q: "rova" })).toBe("/explore?q=rova&view=artists");
  });

  it("reads an unknown art form as « All », a month outside the list as « All months », and any other view as the works", () => {
    expect(readFilters({ category: "painting", month: "2026-10", q: " rova ", view: "artists" }, CATEGORIES, MONTHS)).toEqual({ category: "painting", month: "2026-10", q: "rova", view: "artists" });
    expect(readFilters({ category: "weaving", month: "2025-11", view: "grid" }, CATEGORIES, MONTHS)).toEqual({ category: undefined, month: undefined, q: "", view: "works" });
    expect(readFilters({ category: ["painting", "music"], q: ["a", "b"] }, CATEGORIES, MONTHS)).toEqual({ category: undefined, month: undefined, q: "", view: "works" });
  });

  it("cuts the searched text at 100 characters", () => {
    expect(readFilters({ q: "x".repeat(140) }, CATEGORIES, MONTHS).q).toHaveLength(100);
  });
});

describe("a list that may be cut", () => {
  it("is one as long as the limit: a shorter answer is the whole list", () => {
    expect(mayBeCut(SEARCH_POOL - 1, SEARCH_POOL)).toBe(false);
    expect(mayBeCut(SEARCH_POOL, SEARCH_POOL)).toBe(true);
    expect(mayBeCut(0, SEARCH_POOL)).toBe(false);
  });
});

describe("the feed of works", () => {
  it("makes each tile one link to the notice of the work, with title, maker, art form, badge and votes", () => {
    const markup = html(<WorksFeed works={[work("w1"), work("w2", { votes: 1, human_proven: false, ai_declared: true }), work("w3", { human_proven: false })]} read={3} filters={ALL} />);
    expect(hrefs(markup)).toEqual(["/works/w1", "/works/w2", "/works/w3"]);
    const [first, second, third] = links(markup);
    for (const text of ["Title w1", "Rova Rasoanaivo · Painting", "Human-made", "3 votes"]) expect(first).toContain(text);
    for (const text of ["AI-assisted", "1 vote<"]) expect(second).toContain(text);
    expect(third).toContain("No proof of process yet");
    expect(first).toContain('alt="Title w1 by Rova Rasoanaivo"');
  });

  it("writes the kind of a work that has no picture", () => {
    const markup = html(<WorksFeed works={[work("a", { media_kind: "audio" }), work("v", { media_kind: "video" }), work("m", { media_kind: "model" })]} read={3} filters={ALL} />);
    for (const text of ["Sound", "Video", "3D object"]) expect(markup).toContain(text);
    expect(markup).not.toContain("<img");
  });

  it("counts the works only when the list is whole", () => {
    expect(html(<WorksFeed works={[work("w1"), work("w2")]} read={2} filters={ALL} />)).toContain("2 works");
    expect(html(<WorksFeed works={[work("w1")]} read={SEARCH_POOL - 1} filters={{ ...ALL, q: "w1" }} />)).toContain("1 work<");
    const cut = html(<WorksFeed works={[work("w1"), work("w2")]} read={SEARCH_POOL} filters={ALL} />);
    expect(cut).not.toMatch(/\d+ works?</);
  });

  it("says that only the 200 most recent works are read when the limit is reached, also when nothing matches", () => {
    const sentence = "Only the 200 most recent works of this filter are read";
    expect(html(<WorksFeed works={[work("w1")]} read={SEARCH_POOL} filters={ALL} />)).toContain(sentence);
    const nothing = html(<WorksFeed works={[]} read={SEARCH_POOL} filters={{ ...ALL, q: "valiha" }} />);
    expect(nothing).toContain(sentence);
    expect(nothing).toContain("Nothing matches “valiha”.");
    expect(html(<WorksFeed works={[work("w1")]} read={SEARCH_POOL - 1} filters={ALL} />)).not.toContain(sentence);
  });

  it("names the filters that emptied the feed, and offers to publish", () => {
    expect(emptyKey({})).toBe("explore.emptyAll");
    expect(emptyKey({ category: "painting" })).toBe("explore.empty");
    expect(emptyKey({ month: "2026-10" })).toBe("explore.emptyMonth");
    expect(emptyKey({ category: "painting", month: "2026-10" })).toBe("explore.emptyCategoryMonth");
    const month = html(<WorksFeed works={[]} read={0} filters={{ ...ALL, month: "2026-10" }} />);
    expect(month).toContain("Nothing was published that month.");
    expect(month).not.toContain("in this category");
    expect(hrefs(month)).toEqual(["/me?tab=publish"]);
    expect(html(<WorksFeed works={[]} read={0} filters={{ ...ALL, category: "painting" }} />)).toContain("Nothing published in this category yet.");
  });
});

describe("the artists of Explore", () => {
  it("draws a pill per artist to the artist page, with the region when there is one, then the way to all of them", () => {
    const filters: Filters = { category: "painting", month: "2026-11", q: "ro", view: "works" };
    const markup = html(<ArtistsRow artists={[artist("a1"), artist("a2", { region: "" })]} filters={filters} />);
    expect(hrefs(markup)).toEqual(["/artists/a1", "/artists/a2", "/explore?category=painting&month=2026-11&q=ro&view=artists#artists-title"]);
    expect(markup).toContain("Artist a1 · Analamanga");
    expect(markup).toContain(">Artist a2<");
    expect(markup).toContain("All artists");
    // The plan of the museum links to this heading.
    expect(markup).toMatch(/<h2 id="artists-title"/);
  });

  it("draws nothing when no artist matches", () => {
    expect(html(<ArtistsRow artists={[]} filters={ALL} />)).toBe("");
  });

  it("lists every artist with region and biography, counted only when the list is whole", () => {
    const filters: Filters = { category: "music", q: "", view: "artists" };
    const whole = html(<ArtistsList artists={[artist("a1"), artist("a2", { bio: "" })]} cut={false} filters={filters} />);
    expect(whole).toMatch(/<h2 id="artists-title"[^>]*>Artists and their museums<span> · 2<\/span><\/h2>/);
    for (const text of ["Artist a1", "Analamanga", "Painter of red earth."]) expect(whole).toContain(text);
    expect(hrefs(whole)).toEqual(["/explore?category=music", "/artists/a1", "/artists/a2"]);

    const cut = html(<ArtistsList artists={[artist("a1")]} cut filters={filters} />);
    expect(cut).not.toContain(" · 1<");
    expect(cut).toContain(`The list stops at the first ${MAX_ITEMS} artists, in alphabetical order.`);
  });

  it("says when no artist matches, or when none has a profile yet", () => {
    expect(html(<ArtistsList artists={[]} cut={false} filters={{ q: "zzz", view: "artists" }} />)).toContain("Nothing matches “zzz”.");
    expect(html(<ArtistsList artists={[]} cut={false} filters={{ q: "", view: "artists" }} />)).toContain("No artist has a profile yet.");
  });
});

describe("the head and the filters", () => {
  it("draws the title before any answer of the API", () => {
    const markup = html(<ExploreHead />);
    expect(markup).toMatch(/<h1[^>]*><span>The works,<\/span><span[^>]*>the artists\.<\/span><\/h1>/);
  });

  it("keeps the search box, its 100 characters and the twelve months", () => {
    const months = Array.from({ length: 12 }, (_, i) => `2026-${String(12 - i).padStart(2, "0")}`);
    const markup = html(<ExploreFilters q="rova" month="2026-11" months={months} category="painting" />);
    expect(markup).toMatch(/<form role="search"/);
    const input = markup.match(/<input[^>]*>/)?.[0] ?? "";
    for (const attribute of ['id="explore-q"', 'type="search"', 'maxLength="100"', 'value="rova"', 'placeholder="Search a work, an artist, a story"']) expect(input).toContain(attribute);
    expect(markup).toMatch(/<label for="explore-q"[^>]*>Search<\/label>/);
    expect(markup.match(/<option/g)).toHaveLength(13);
    expect(markup).toContain('<option value="">All months</option>');
    expect(markup).toMatch(/<option value="2026-11" selected="">November 2026<\/option>/);
  });

  it("leaves the month out of the list of artists, which has none", () => {
    const markup = html(<ExploreFilters q="" months={["2026-11"]} view="artists" />);
    expect(markup).toContain('id="explore-q"');
    expect(markup).not.toContain("<select");
  });

  it("keeps the month and the searched text from one art form to the other, and marks the chosen one", () => {
    const markup = html(<ExploreCategories categories={CATEGORIES} filters={{ category: "music", month: "2026-10", q: "valiha" }} />);
    expect(hrefs(markup)).toEqual(["/explore?month=2026-10&q=valiha", "/explore?category=painting&month=2026-10&q=valiha", "/explore?category=music&month=2026-10&q=valiha"]);
    const current = links(markup).filter((a) => a.includes('aria-current="page"'));
    expect(current).toHaveLength(1);
    expect(current[0]).toContain("Music");
    expect(markup).toMatch(/<nav[^>]*aria-label="Categories"/);
  });
});
