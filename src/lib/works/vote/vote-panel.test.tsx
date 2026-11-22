import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Work } from "@/lib/api";
import { currentMonth, shiftMonth } from "@/lib/months";
import type { VoteDisabledReason } from "./disabled-reason";
import type { VoteState } from "./vote-state";

vi.mock("@/lib/auth-client", () => ({ authClient: { useSession: () => ({ data: null, isPending: false }) } }));

const { REASON_TEXT, VoteActions, VoteContest, VotePanel } = await import("@/lib/works/vote");
type WorkVote = import("@/lib/works/vote").WorkVote;

// The server renders in English, the reference dictionary.
const work: Work = {
  id: "w1",
  artist_id: "a1",
  artist_name: "Rova Rasoanaivo",
  title: "Hautes Terres, fin du jour",
  story: "",
  category: "painting",
  exposition_id: null,
  media_url: "http://localhost:8000/media/w1.jpg",
  media_kind: "image",
  proof_urls: [],
  sha256: "3f9a".padEnd(60, "0") + "c21e",
  human_proven: true,
  ai_declared: false,
  month: currentMonth(),
  created_at: `${currentMonth()}-02T10:00:00Z`,
  votes: 14,
};

const vote = (state: VoteState, over: Partial<WorkVote> = {}): WorkVote => ({ state, pending: false, votes: work.votes, vote: () => false, canVote: state === "open", ...over });
const button = (markup: string) => markup.match(/<button[^>]*>/)?.[0] ?? "";
const REASONS: Record<VoteDisabledReason, string> = {
  not_eligible: "Only works with proof of process can receive votes.",
  not_in_contest: "Only works published this month can receive votes.",
  own_work: "You cannot vote for your own work.",
  already_voted: "You already voted in this category this month.",
};

describe("VoteContest", () => {
  it("names the contest of the work and counts its votes of the month, with the rule", () => {
    const markup = renderToStaticMarkup(<VoteContest work={work} vote={vote("open")} />);
    expect(markup).toMatch(/Contest · Painting · \w+ \d{4}/);
    expect(markup).toMatch(/>14<\/strong>.*votes this month/);
    expect(markup).toContain("One vote per category and per month. It cannot be withdrawn.");
  });

  it("says which month the count belongs to for a work of a past month", () => {
    const past = { ...work, month: shiftMonth(currentMonth(), -1), votes: 1 };
    const markup = renderToStaticMarkup(<VoteContest work={past} vote={vote("open", { votes: 1 })} />);
    expect(markup).toMatch(/>1<\/strong>.*vote in \w+ \d{4}/);
    expect(markup).not.toContain("this month");
  });
});

describe("VoteActions", () => {
  it("offers the vote when it is open", () => {
    const markup = renderToStaticMarkup(<VoteActions work={work} vote={vote("open")} />);
    expect(markup).toContain("Vote for this work");
    expect(button(markup)).not.toContain("disabled");
    expect(markup).not.toContain("data-reason");
  });

  it.each(Object.keys(REASONS) as VoteDisabledReason[])("disables the button and says why in words: %s", (reason) => {
    const state: VoteState = { blocked: REASONS[reason], reason };
    const markup = renderToStaticMarkup(<VoteActions work={work} vote={vote(state)} />);
    expect(button(markup)).toContain('disabled=""');
    const note = markup.match(/<p[^>]*data-reason="[^"]*"[^>]*>[^<]*<\/p>/)?.[0] ?? "";
    expect(note).toContain(`data-reason="${reason}"`);
    expect(note).toContain(REASONS[reason]);
    // Known before any click: part of the page, described by the button, not an alert.
    expect(note).not.toContain('role="alert"');
    const id = note.match(/id="([^"]*)"/)?.[1];
    expect(button(markup)).toContain(`aria-describedby="${id}"`);
  });

  it("has a sentence for each of the four reasons, in the three languages", async () => {
    const { dictionaries } = await import("@/i18n/locales");
    for (const reason of Object.keys(REASONS) as VoteDisabledReason[]) {
      expect(dictionaries.en[REASON_TEXT[reason]]).toBe(REASONS[reason]);
      expect(dictionaries.fr[REASON_TEXT[reason]]).not.toBe(REASONS[reason]);
      expect(dictionaries.mg[REASON_TEXT[reason]]).not.toBe(REASONS[reason]);
    }
  });

  it("waits, disabled, while the person's votes are not known", () => {
    const markup = renderToStaticMarkup(<VoteActions work={work} vote={vote("checking")} />);
    expect(button(markup)).toContain('disabled=""');
    expect(button(markup)).toContain('aria-busy="true"');
  });

  it("invites a visitor to sign in and to come back to this notice", () => {
    const markup = renderToStaticMarkup(<VoteActions work={work} vote={vote("signin")} />);
    expect(markup).toContain('href="/sign-in?next=%2Fworks%2Fw1"');
    expect(markup).toContain("Sign in to vote");
    expect(markup).not.toContain("<button");
    const elsewhere = renderToStaticMarkup(<VoteActions work={work} vote={vote("signin")} returnTo="/artists/a1/museum" />);
    expect(elsewhere).toContain('href="/sign-in?next=%2Fartists%2Fa1%2Fmuseum"');
  });

  it("says the vote is counted, and offers nothing to take it back", () => {
    const markup = renderToStaticMarkup(<VotePanel work={work} vote={vote("done", { votes: 15 })} />);
    expect(markup).toMatch(/role="status"[^>]*>.*Your vote is counted\. Thank you\./);
    expect(markup).not.toContain("<button");
    expect(markup).not.toMatch(/withdraw my|remove my|undo|cancel/i);
    expect(markup).toContain(">15</strong>");
  });

  it("announces a refusal the API gave after a click", () => {
    const markup = renderToStaticMarkup(<VoteActions work={work} vote={vote({ blocked: "Confirm your email address first: the link is in your inbox." })} />);
    expect(markup).toMatch(/<p[^>]*role="alert"[^>]*>Confirm your email address first/);
    expect(button(markup)).toContain('disabled=""');
  });

  it("keeps the button to try again when the vote did not reach the API", () => {
    const markup = renderToStaticMarkup(<VoteActions work={work} vote={vote({ blocked: "The vote did not go through.", retry: true }, { canVote: true })} />);
    expect(button(markup)).not.toContain("disabled");
    expect(markup).toMatch(/role="alert"[^>]*>The vote did not go through\./);
  });

  it("shows the vote on its way", () => {
    const markup = renderToStaticMarkup(<VoteActions work={work} vote={vote("open", { pending: true })} />);
    expect(button(markup)).toContain('disabled=""');
    expect(markup).toContain("Voting");
  });

  it("places a second action beside the button", () => {
    const markup = renderToStaticMarkup(<VoteActions work={work} vote={vote("open")} aside={<span data-aside="">Next work</span>} />);
    expect(markup).toMatch(/<\/button><span data-aside="">Next work<\/span>/);
  });
});
