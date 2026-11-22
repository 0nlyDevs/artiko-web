import { describe, expect, it } from "vitest";
import type { Category, HallOfFameEntry, Vote } from "@/lib/api";
import { FRAMES, hallHref, hang, monthName, readRoom, resolveCategory, resolveMonth, voteIn, worksLink } from "./room";

const entry = (rank: number): HallOfFameEntry => ({ rank, votes: 10 - rank, work: { id: `w${rank}`, title: `Work ${rank}` } }) as HallOfFameEntry;
const CATEGORIES = [{ id: "painting", label: "Painting" }, { id: "music", label: "Music" }] as Category[];

describe("the month of the room", () => {
  it("keeps a past or current month of the address", () => {
    expect(resolveMonth("2026-10", "2026-11")).toBe("2026-10");
    expect(resolveMonth("2026-11", "2026-11")).toBe("2026-11");
    expect(resolveMonth("2019-01", "2026-11")).toBe("2019-01");
  });

  it("refuses a month to come: the room shows the current month", () => {
    expect(resolveMonth("2026-12", "2026-11")).toBe("2026-11");
    expect(resolveMonth("2027-01", "2026-11")).toBe("2026-11");
  });

  it("reads anything else as the current month", () => {
    for (const param of [undefined, "", "2026-13", "2026-1", "november", ["2026-10", "2026-09"]]) expect(resolveMonth(param, "2026-11")).toBe("2026-11");
  });
});

describe("the art form of the room", () => {
  it("is the one of the address when the API lists it, painting otherwise", () => {
    expect(resolveCategory(CATEGORIES, "music")).toBe("music");
    expect(resolveCategory(CATEGORIES, "pottery")).toBe("painting");
    expect(resolveCategory(CATEGORIES, undefined)).toBe("painting");
    expect(resolveCategory(CATEGORIES, ["music"])).toBe("painting");
  });
});

describe("the five frames", () => {
  it("always hangs five frames and leaves empty those the API did not fill", () => {
    for (let count = 0; count <= FRAMES; count++) {
      const frames = hang(Array.from({ length: count }, (_, i) => entry(i + 1)));
      expect(frames.map((f) => f.rank)).toEqual([1, 2, 3, 4, 5]);
      expect(frames.filter((f) => f.entry === null)).toHaveLength(FRAMES - count);
    }
  });

  it("places an entry by the rank the API gives it, not by its position in the answer", () => {
    const frames = hang([entry(3), entry(1)]);
    expect(frames.map((f) => f.entry?.work.id ?? null)).toEqual(["w1", null, "w3", null, null]);
  });
});

describe("the links of the room", () => {
  it("keeps the address of the team's page", () => {
    expect(hallHref("music", "2026-10")).toBe("/hall-of-fame?category=music&month=2026-10");
  });

  it("opens the works of the art form and the month in Explore, for the twelve months Explore lists", () => {
    expect(worksLink("music", "2026-11", "2026-11")).toEqual({ href: "/explore?category=music&month=2026-11", scope: "current" });
    expect(worksLink("music", "2026-10", "2026-11")).toEqual({ href: "/explore?category=music&month=2026-10", scope: "month" });
    expect(worksLink("music", "2025-12", "2026-11")).toEqual({ href: "/explore?category=music&month=2025-12", scope: "month" });
  });

  it("opens every work of the art form for an older month, which Explore would read as « all months » anyway", () => {
    expect(worksLink("music", "2025-11", "2026-11")).toEqual({ href: "/explore?category=music", scope: "all" });
    expect(worksLink("crafts", "2019-01", "2026-11")).toEqual({ href: "/explore?category=crafts", scope: "all" });
  });
});

describe("the room of an address", () => {
  it("offers the month after only when the month shown is a past one", () => {
    expect(readRoom(CATEGORIES, { category: "music", month: "2026-10" }, "2026-11")).toEqual({ category: CATEGORIES[1], month: "2026-10", canGoNext: true });
    expect(readRoom(CATEGORIES, { category: "music", month: "2026-11" }, "2026-11").canGoNext).toBe(false);
    // A month to come is read as the current month: there is nothing after it either.
    expect(readRoom(CATEGORIES, { month: "2027-03" }, "2026-11")).toEqual({ category: CATEGORIES[0], month: "2026-11", canGoNext: false });
  });

  it("opens painting for an address without a known art form, with the label of the API", () => {
    expect(readRoom(CATEGORIES, {}, "2026-11").category).toEqual({ id: "painting", label: "Painting" });
    expect(readRoom(CATEGORIES, { category: "pottery" }, "2026-11").category).toEqual({ id: "painting", label: "Painting" });
  });

  it("still names the room when the API lists no art form: the id stands in for the label", () => {
    expect(readRoom([], { category: "music" }, "2026-11")).toEqual({ category: { id: "painting", label: "painting" }, month: "2026-11", canGoNext: false });
  });
});

describe("the visitor's vote", () => {
  const votes = [
    { work_id: "a", category: "music", month: "2026-11" },
    { work_id: "b", category: "painting", month: "2026-11" },
  ] as Vote[];

  it("is the one cast in the art form of the room, among the votes of every art form", () => {
    expect(voteIn(votes, "painting")?.work_id).toBe("b");
    expect(voteIn(votes, "music")?.work_id).toBe("a");
    expect(voteIn(votes, "dance")).toBeNull();
    expect(voteIn([], "painting")).toBeNull();
  });
});

describe("monthName", () => {
  it("names the month alone, in UTC", () => {
    expect(monthName("2026-10", "en")).toBe("October");
    expect(monthName("2026-01", "fr")).toBe("janvier");
  });
});
