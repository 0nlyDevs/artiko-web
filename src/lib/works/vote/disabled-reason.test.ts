import { describe, expect, it } from "vitest";
import type { Vote } from "@/lib/api";
import { voteDisabledReason, votedForWork, type Voter } from "./disabled-reason";

const MONTH = "2026-11";
const work = { id: "w1", artist_id: "a1", category: "painting", month: MONTH, human_proven: true } as const;
const vote = (over: Partial<Vote> = {}): Vote => ({ work_id: "w9", category: "painting", month: MONTH, ...over });
const voter = (over: Partial<Voter> = {}): Voter => ({ artistId: null, votes: [], ...over });

describe("voteDisabledReason", () => {
  it("leaves the vote open for a proven work of the month, by someone else, in a category not voted yet", () => {
    expect(voteDisabledReason({ work, month: MONTH, voter: voter() })).toBeNull();
    // An artist voting for another artist's work, with a vote in another category and one from last month.
    const busy = voter({ artistId: "a2", votes: [vote({ category: "music" }), vote({ month: "2026-10" })] });
    expect(voteDisabledReason({ work, month: MONTH, voter: busy })).toBeNull();
  });

  it("not_eligible: the work has no human_proven badge", () => {
    expect(voteDisabledReason({ work: { ...work, human_proven: false }, month: MONTH, voter: voter() })).toBe("not_eligible");
  });

  it("not_in_contest: the work belongs to another month than the current UTC month", () => {
    expect(voteDisabledReason({ work: { ...work, month: "2026-10" }, month: MONTH, voter: voter() })).toBe("not_in_contest");
    expect(voteDisabledReason({ work, month: "2026-12", voter: voter() })).toBe("not_in_contest");
  });

  it("own_work: the signed-in artist is the author", () => {
    expect(voteDisabledReason({ work, month: MONTH, voter: voter({ artistId: "a1" }) })).toBe("own_work");
  });

  it("already_voted: the person already voted in this category this month", () => {
    expect(voteDisabledReason({ work, month: MONTH, voter: voter({ votes: [vote()] }) })).toBe("already_voted");
    expect(voteDisabledReason({ work, month: MONTH, voter: voter({ votes: [vote({ work_id: "w1" })] }) })).toBe("already_voted");
  });

  it("answers in the API's order: the work before the person, the author before the vote already cast", () => {
    const everything = voter({ artistId: "a1", votes: [vote()] });
    expect(voteDisabledReason({ work: { ...work, human_proven: false, month: "2026-10" }, month: MONTH, voter: everything })).toBe("not_eligible");
    expect(voteDisabledReason({ work: { ...work, month: "2026-10" }, month: MONTH, voter: everything })).toBe("not_in_contest");
    expect(voteDisabledReason({ work, month: MONTH, voter: everything })).toBe("own_work");
  });

  it("only knows the work for a visitor who is not signed in", () => {
    expect(voteDisabledReason({ work, month: MONTH, voter: null })).toBeNull();
    expect(voteDisabledReason({ work: { ...work, human_proven: false }, month: MONTH, voter: null })).toBe("not_eligible");
    expect(voteDisabledReason({ work: { ...work, month: "2026-10" }, month: MONTH, voter: null })).toBe("not_in_contest");
  });
});

describe("votedForWork", () => {
  it("tells this work's vote from another vote in the same category", () => {
    expect(votedForWork(work, voter({ votes: [vote({ work_id: "w1" })] }), MONTH)).toBe(true);
    expect(votedForWork(work, voter({ votes: [vote()] }), MONTH)).toBe(false);
    expect(votedForWork(work, voter({ votes: [vote({ work_id: "w1", month: "2026-10" })] }), MONTH)).toBe(false);
    expect(votedForWork(work, null, MONTH)).toBe(false);
  });
});
