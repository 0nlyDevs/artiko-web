import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Work } from "@/lib/api";
import { PublishDone } from "./publish-done";
import { PublishRefused } from "./publish-refused";

const work: Work = {
  id: "w1",
  artist_id: "a1",
  artist_name: "Rova Rasoanaivo",
  title: "Hautes Terres, fin du jour",
  story: "",
  category: "painting",
  exposition_id: null,
  series_id: null,
  media_url: "https://api.test/media/a.jpg",
  media_hd_url: null,
  poster_url: null,
  media_kind: "image",
  proof_urls: [],
  sha256: "3f9a" + "0".repeat(56) + "c21e",
  human_proven: true,
  ai_declared: false,
  month: "2026-11",
  created_at: "2026-11-22T03:41:00Z",
  votes: 0,
};
const nothing = () => {};
const done = (override: Partial<Work> = {}, proofsSent = 2) => renderToStaticMarkup(<PublishDone work={{ ...work, ...override }} proofsSent={proofsSent} onAnother={nothing} />);

describe("the confirmation (frame R5)", () => {
  it("thanks the artist and gives the facts the API returned", () => {
    const html = done();

    expect(html).toMatch(/<h1[^>]*><span lang="mg"[^>]*>Misaotra!<\/span> <span[^>]*>Your work is<\/span> <span[^>]*>on the wall\.<\/span><\/h1>/);
    expect(html).toContain("Work published · fingerprint 3F9A…C21E");
    expect(html).toContain("Hautes Terres, fin du jour");
    expect(html).toContain("Painting · Rova Rasoanaivo · published on November 22, 2026");
    expect(html).toContain("Visible to everyone, right now");
  });

  it("shows the badge read from human_proven, with the proofs sent", () => {
    const html = done();

    expect(html).toContain("Human-made badge");
    expect(html).toContain("2 proofs sent · no AI declared");
  });

  it("names the contest month of a work that has the badge, and no closing date", () => {
    const html = done();

    expect(html).toContain("In the contest · November 2026");
    expect(html).toContain("competes for the Painting Hall of Fame of November 2026");
    expect(html).toContain("0 votes · votes open during this month, UTC time");
    expect(html).not.toMatch(/30 November|November 30|midnight|closes/i);
  });

  it("says nothing of the contest for a work without the badge", () => {
    const html = done({ human_proven: false }, 1);

    expect(html).not.toContain("In the contest");
    expect(html).not.toContain("competes");
    expect(html).toContain("No Human-made badge");
    expect(html).toContain("1 proof sent: the badge was not given, so the work cannot receive votes");
    expect(html).toContain("Without the Human-made badge, it cannot receive votes.");
  });

  it("gives the declared AI as the reason when there is no badge", () => {
    const html = done({ human_proven: false, ai_declared: true });

    expect(html).toContain("AI assistance declared: the work does not enter the vote");
    expect(html).not.toContain("In the contest");
  });

  it("leads to the artist's room and to another publication, and nowhere else", () => {
    const html = done();

    expect(html).toContain('href="/artists/a1/museum"');
    expect(html).toContain("See it in my room");
    expect(html).toContain("Publish another work");
    expect(html.match(/<a /g)).toHaveLength(1);
    expect(html.match(/<button/g)).toHaveLength(1);
  });

  it("offers neither to edit nor to delete the published work", () => {
    expect(done()).not.toMatch(/edit|delete|modif|supprim/i);
  });
});

describe("the refusal for a probable copy (frame R6)", () => {
  const refused = (caseId: string | null) =>
    renderToStaticMarkup(<PublishRefused caseId={caseId} title="Hautes Terres, fin du jour" category="painting" at={new Date(2026, 10, 22, 3, 41)} onChooseAnother={nothing} />);

  it("shows the case number of the error and lets it be copied", () => {
    const html = refused("7c2e41b8-0f3a-4d19-9b2e-51c0a8d3e7f4");

    expect(html).toContain("Publication refused · probable copy");
    expect(html).toContain("7c2e41b8-0f3a-4d19-9b2e-51c0a8d3e7f4");
    expect(html).toContain("Review case · no.");
    expect(html).toContain("Copy the case number");
    expect(html).toContain("Nothing was published.");
  });

  it("names the work as it was typed and dates the refusal from this browser", () => {
    const html = refused("c1");

    expect(html).toContain("Hautes Terres, fin du jour");
    expect(html).toContain("Painting · not published · refused on November 22, 2026 at 03:41 AM");
  });

  it("promises no review and no follow-up the API does not have", () => {
    const html = refused("c1");

    expect(html).toContain("No follow-up online");
    expect(html).not.toMatch(/jury|will look|write to the team/i);
  });

  it("leads back to the first step to choose another file", () => {
    expect(refused("c1")).toContain("Choose another file");
  });

  it("has no number to copy when the API gave none", () => {
    const html = refused(null);

    expect(html).not.toContain("Copy the case number");
    expect(html).toContain("Review case");
    expect(html).not.toContain("Keep the case number");
  });
});
