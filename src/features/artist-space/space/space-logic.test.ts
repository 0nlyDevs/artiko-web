import { describe, expect, it } from "vitest";
import { contestStatus, EXPOSITION_DESCRIPTION_MAX, EXPOSITION_TITLE_MAX, expositionBody, resolveTab, SECTION_ID, withPublished } from "./space-logic";

describe("resolveTab", () => {
  it("keeps the four addresses of an artist's space", () => {
    expect(["works", "publish", "votes", "profile"].map((tab) => resolveTab(tab, true))).toEqual(["works", "publish", "votes", "profile"]);
  });

  it("asks for no section without a parameter or with an unknown one", () => {
    expect(resolveTab(null, true)).toBeNull();
    expect(resolveTab("settings", true)).toBeNull();
    expect(resolveTab("", false)).toBeNull();
  });

  it("gives someone without an artist profile the profile and the votes only", () => {
    expect(resolveTab("profile", false)).toBe("profile");
    expect(resolveTab("votes", false)).toBe("votes");
    expect(resolveTab("publish", false)).toBeNull();
    expect(resolveTab("works", false)).toBeNull();
  });

  it("has an element to scroll to for every section but publishing, which takes the page", () => {
    expect(Object.keys(SECTION_ID).sort()).toEqual(["expositions", "profile", "votes", "works"]);
  });
});

describe("contestStatus", () => {
  it("is open for a proven work of the current month", () => {
    expect(contestStatus({ human_proven: true, month: "2026-11" }, "2026-11")).toBe("open");
  });

  it("is closed for a proven work of another month", () => {
    expect(contestStatus({ human_proven: true, month: "2026-10" }, "2026-11")).toBe("closed");
  });

  it("is out for a work without the human-made badge, whatever its month", () => {
    expect(contestStatus({ human_proven: false, month: "2026-11" }, "2026-11")).toBe("out");
    expect(contestStatus({ human_proven: false, month: "2026-10" }, "2026-11")).toBe("out");
  });
});

describe("expositionBody", () => {
  it("sends the trimmed title alone when there is no description", () => {
    expect(expositionBody({ title: "  Lumières des Hautes Terres ", description: "  " })).toEqual({ body: { title: "Lumières des Hautes Terres" } });
  });

  it("sends the description when there is one", () => {
    expect(expositionBody({ title: "Carnets", description: "Études d’atelier" })).toEqual({ body: { title: "Carnets", description: "Études d’atelier" } });
  });

  it("refuses an empty title and one over 200 characters", () => {
    expect(expositionBody({ title: "", description: "" })).toEqual({ invalid: "title" });
    expect(expositionBody({ title: "   ", description: "" })).toEqual({ invalid: "title" });
    expect(expositionBody({ title: "a".repeat(EXPOSITION_TITLE_MAX), description: "" })).toEqual({ body: { title: "a".repeat(200) } });
    expect(expositionBody({ title: "a".repeat(EXPOSITION_TITLE_MAX + 1), description: "" })).toEqual({ invalid: "title" });
  });

  it("refuses a description over 2,000 characters", () => {
    expect(expositionBody({ title: "Carnets", description: "a".repeat(EXPOSITION_DESCRIPTION_MAX) })).toHaveProperty("body");
    expect(expositionBody({ title: "Carnets", description: "a".repeat(EXPOSITION_DESCRIPTION_MAX + 1) })).toEqual({ invalid: "description" });
  });
});

describe("withPublished", () => {
  type Hung = { id: string; exposition_id: string | null };
  const lists: { works: Hung[]; expositions: { id: string; works_count: number }[] } = {
    works: [{ id: "w1", exposition_id: null }],
    expositions: [{ id: "e1", works_count: 2 }, { id: "e2", works_count: 0 }],
  };

  it("puts the new work first and leaves the expositions when it joined none", () => {
    const next = withPublished(lists, { id: "w2", exposition_id: null }, null);
    expect(next.works.map((w) => w.id)).toEqual(["w2", "w1"]);
    expect(next.expositions).toEqual(lists.expositions);
  });

  it("counts the work in the exposition it joined", () => {
    expect(withPublished(lists, { id: "w2", exposition_id: "e1" }, null).expositions).toEqual([{ id: "e1", works_count: 3 }, { id: "e2", works_count: 0 }]);
  });

  it("adds the exposition created with the publication, once, with its first work", () => {
    const created = { id: "e3", works_count: 0 };
    const next = withPublished(lists, { id: "w2", exposition_id: "e3" }, created);
    expect(next.expositions).toEqual([{ id: "e3", works_count: 1 }, ...lists.expositions]);
    expect(withPublished(next, { id: "w3", exposition_id: "e3" }, created).expositions.filter((e) => e.id === "e3")).toEqual([{ id: "e3", works_count: 2 }]);
  });
});
