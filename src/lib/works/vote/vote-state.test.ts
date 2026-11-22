import { describe, expect, it } from "vitest";
import type { Vote } from "@/lib/api";
import type { VoteDisabledReason } from "./disabled-reason";
import { canVote, voteState, type VoteAnswer } from "./vote-state";
import type { VoterState } from "./voter-store";

const MONTH = "2026-11";
const work = { id: "w1", artist_id: "a1", category: "painting", month: MONTH, human_proven: true } as const;
const vote = (over: Partial<Vote> = {}): Vote => ({ work_id: "w9", category: "painting", month: MONTH, ...over });
const ready = (over: { artistId?: string | null; votes?: Vote[] } = {}): VoterState => ({ status: "ready", artistId: null, votes: [], ...over });
const say = (reason: VoteDisabledReason) => `because ${reason}`;
const state = (voter: VoterState, answer: VoteAnswer = null, over: Partial<typeof work> | { month: string } | { human_proven: boolean } = {}) =>
  voteState({ work: { ...work, ...over }, month: MONTH, voter, answer, say });

describe("voteState", () => {
  it("waits while the session or the person's votes are not known", () => {
    expect(state({ status: "pending" })).toBe("checking");
  });

  it("invites a visitor who is not signed in", () => {
    expect(state({ status: "anonymous" })).toBe("signin");
  });

  it("opens the vote for a signed-in person nothing stops, and when their votes could not be read", () => {
    expect(state(ready())).toBe("open");
    expect(state({ status: "unknown", error: null })).toBe("open");
  });

  it("closes the vote with the reason in words before any click", () => {
    expect(state(ready({ artistId: "a1" }))).toEqual({ blocked: "because own_work", reason: "own_work" });
    expect(state(ready({ votes: [vote()] }))).toEqual({ blocked: "because already_voted", reason: "already_voted" });
  });

  it("says what closes the work itself to everyone, signed in or not", () => {
    for (const voter of [{ status: "pending" }, { status: "anonymous" }, ready()] as VoterState[]) {
      expect(state(voter, null, { human_proven: false })).toEqual({ blocked: "because not_eligible", reason: "not_eligible" });
      expect(state(voter, null, { month: "2026-10" })).toEqual({ blocked: "because not_in_contest", reason: "not_in_contest" });
    }
  });

  it("shows the vote as cast when it went to this work, now or earlier this month", () => {
    expect(state(ready(), "done")).toBe("done");
    expect(state(ready({ votes: [vote({ work_id: "w1" })] }))).toBe("done");
  });

  it("keeps what the API answered to a click", () => {
    expect(state(ready(), "signin")).toBe("signin");
    expect(state(ready(), { blocked: "Confirm your email address first" })).toEqual({ blocked: "Confirm your email address first" });
  });
});

describe("canVote", () => {
  it("lets a click or a double-click through only when the vote is open or can be tried again", () => {
    expect(canVote("open")).toBe(true);
    expect(canVote({ blocked: "The vote did not go through.", retry: true })).toBe(true);
    for (const closed of ["checking", "done", "signin", { blocked: "x", reason: "own_work" }, { blocked: "refused" }] as const) expect(canVote(closed)).toBe(false);
  });
});
