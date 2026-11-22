import type { Work } from "@/lib/api";
import { voteDisabledReason, votedForWork, type VoteDisabledReason } from "./disabled-reason";
import type { VoterState } from "./voter-store";

/**
 * - `open`: the button casts the vote;
 * - `checking`: the session or the person's votes are not known yet, the button waits;
 * - `done`: this person's vote of the month went to this work;
 * - `signin`: nobody is signed in;
 * - `blocked`: the vote is closed, in words. `reason` when it was known before any click, `retry` when
 *   the vote did not reach the API and the button stays to try again.
 */
export type VoteState = "open" | "checking" | "done" | "signin" | { blocked: string; reason?: VoteDisabledReason; retry?: boolean };

/** What the API answered to a click: counted, sign in first, or a refusal in words. Null before any click. */
export type VoteAnswer = null | "done" | "signin" | { blocked: string; retry?: boolean };

export interface VoteFacts {
  work: Pick<Work, "id" | "artist_id" | "category" | "month" | "human_proven">;
  /** The current contest month, UTC `YYYY-MM`. */
  month: string;
  voter: VoterState;
  answer: VoteAnswer;
  /** The sentence of a reason, in the active language. */
  say: (reason: VoteDisabledReason) => string;
}

/**
 * The state of a work's vote. A vote already given to this work comes first; then the reasons known
 * before any click (the work, then the person); then what the API answered to a click; then whether
 * we know who is there.
 */
export function voteState({ work, month, voter, answer, say }: VoteFacts): VoteState {
  const known = voter.status === "ready" ? voter : null;
  if (answer === "done" || votedForWork(work, known, month)) return "done";
  const reason = voteDisabledReason({ work, month, voter: known });
  if (reason) return { blocked: say(reason), reason };
  if (answer) return answer;
  if (voter.status === "pending") return "checking";
  if (voter.status === "anonymous") return "signin";
  // `ready` with nothing against the vote, or `unknown`: the API remains the judge.
  return "open";
}

/** Whether a click (or a double-click on the picture) may send the vote. */
export function canVote(state: VoteState): boolean {
  return state === "open" || (typeof state === "object" && state.retry === true);
}
