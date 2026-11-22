import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Practice } from "@/lib/api";
import { statusCounts, succession, successionPercent, successionWidth } from "./heritage-logic";
import { HeritageHead, HeritageIndex, IndexSkeleton } from "./heritage-view";

// The server renders in English, the reference dictionary.
const html = renderToStaticMarkup;
const count = (markup: string, pattern: RegExp) => (markup.match(pattern) ?? []).length;

const practice = (id: string, overrides: Partial<Practice> = {}): Practice => ({ id, name: `Practice ${id}`, region: "Madagascar", category: "music", practitioners: 100, learners: 30, median_age: 63, status: "red", description: `About ${id}.`, ...overrides });

const INDEX = [
  practice("kabary", { category: "oral_arts" }),
  practice("valiha", { practitioners: 150, learners: 45, median_age: 58 }),
  practice("hiragasy", { category: "dance", practitioners: 200, learners: 140, median_age: 45, status: "orange" }),
  practice("antemoro", { category: "crafts", practitioners: 60, learners: 70, median_age: 40, status: "green" }),
];

describe("the counters of the index", () => {
  it("count the statuses the API gives", () => {
    expect(statusCounts(INDEX)).toEqual({ red: 2, orange: 1, green: 1 });
    expect(statusCounts([])).toEqual({ red: 0, orange: 0, green: 0 });
  });

  it("never work a status out again from the figures", () => {
    // More learners than masters and a young median age would read « passed on »: the API says endangered.
    const odd = practice("odd", { practitioners: 10, learners: 40, median_age: 30, status: "red" });
    expect(statusCounts([odd])).toEqual({ red: 1, orange: 0, green: 0 });
    const markup = html(<HeritageIndex practices={[odd]} />);
    expect(count(markup, /data-status="red"[^>]*>Endangered/g)).toBe(3); // the counter, the card and the table row
    expect(markup).not.toMatch(/data-status="green"[^>]*>Passed on<\/span><\/(span|td|div)>/);
  });
});

describe("the succession of a practice", () => {
  it("is the learners for 100 masters, and a bar that is full at one learner per master", () => {
    expect(successionPercent(practice("a", { practitioners: 120, learners: 30 }))).toBe(25);
    expect(successionWidth(practice("a", { practitioners: 120, learners: 30 }))).toBe("25%");
    expect(successionPercent(practice("b", { practitioners: 60, learners: 70 }))).toBe(117);
    expect(successionWidth(practice("b", { practitioners: 60, learners: 70 }))).toBe("100%");
  });

  it("is zero without any master", () => {
    expect(succession(practice("c", { practitioners: 0, learners: 12 }))).toBe(0);
    expect(successionWidth(practice("c", { practitioners: 0, learners: 12 }))).toBe("0%");
  });
});

describe("the page of the index", () => {
  it("draws the title and the rule of the red list before any answer of the API", () => {
    const markup = html(<HeritageHead />);
    expect(markup).toMatch(/<h1[^>]*><span>Living heritage<\/span><span[^>]*>index\.<\/span><\/h1>/);
    expect(markup).toContain("A practice is endangered when it has fewer than half as many learners as masters");
  });

  it("shows three counters, the most endangered first", () => {
    const markup = html(<HeritageIndex practices={INDEX} />);
    const counters = markup.match(/<dl[^>]*>.*?<\/dl>/)?.[0] ?? "";
    expect([...counters.matchAll(/data-status="(\w+)"[^>]*>([^<]+)<\/span><\/dt><dd[^>]*>(\d+)<\/dd>/g)].map((m) => [m[1], m[2], m[3]])).toEqual([
      ["red", "Endangered", "2"],
      ["orange", "Weakening", "1"],
      ["green", "Passed on", "1"],
    ]);
  });

  it("gives each practice a card for phones and a row of the table, in the order of the API", () => {
    const markup = html(<HeritageIndex practices={INDEX} />);
    const cards = markup.match(/<li[^>]*>.*?<\/li>/g) ?? [];
    const rows = (markup.match(/<tbody>.*<\/tbody>/)?.[0] ?? "").match(/<tr[^>]*>.*?<\/tr>/g) ?? [];
    expect(cards).toHaveLength(4);
    expect(rows).toHaveLength(4);
    for (const list of [cards, rows]) expect(list.map((item) => item.match(/Practice (\w+)/)?.[1])).toEqual(["kabary", "valiha", "hiragasy", "antemoro"]);
    // The card says everything the row says, the description included.
    for (const text of ["Practice kabary", "Madagascar", "Oral arts", "About kabary.", "Endangered", "Masters", "100", "Learners", "30", "Median age", "63", "30 learners for 100 masters"]) expect(cards[0]).toContain(text);
    for (const text of ["Practice hiragasy", "Madagascar", "Dance", "About hiragasy.", "Weakening", "200", "140", "45", "70 learners for 100 masters"]) expect(rows[2]).toContain(text);
  });

  it("keeps a real table, with its seven column headers", () => {
    const markup = html(<HeritageIndex practices={INDEX} />);
    expect([...markup.matchAll(/<th scope="col"[^>]*>([^<]+)<\/th>/g)].map((m) => m[1])).toEqual(["Practice", "Art form", "Masters", "Learners", "Succession", "Median age", "Status"]);
  });

  it("says when the index is empty, without counters nor table", () => {
    const markup = html(<HeritageIndex practices={[]} />);
    expect(markup).toContain("The index holds no practice yet.");
    expect(markup).not.toContain("<table");
    expect(markup).not.toContain("<dl");
  });

  it("names the loading for screen readers", () => {
    expect(html(<IndexSkeleton />)).toMatch(/aria-busy="true"[^>]*><span class="visually-hidden">Loading the index\.<\/span>/);
  });
});
