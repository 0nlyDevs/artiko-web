import type { Vote, Work } from "@/lib/api";

/**
 * Why a person cannot vote for a work, known before any click. The four codes are the API's own
 * (`POST /votes`: 400 `not_eligible`, `not_in_contest`, `own_work`, 409 `already_voted`), so the same
 * dictionary lines say a refusal computed here and one the API answers.
 */
export type VoteDisabledReason = "not_eligible" | "not_in_contest" | "own_work" | "already_voted";

/** What is known of the signed-in person: their artist profile, if any, and their votes (`GET /me`, `GET /votes/mine`). */
export interface Voter {
  artistId: string | null;
  votes: readonly Vote[];
}

export interface VoteQuestion {
  work: Pick<Work, "id" | "artist_id" | "category" | "month" | "human_proven">;
  /** The current contest month, UTC `YYYY-MM` (`currentMonth()`). */
  month: string;
  /** Null for a visitor who is not signed in, or while their votes are not known: only the work can then close the vote. */
  voter: Voter | null;
}

/**
 * The reason the vote is closed, or null when it is open. The order is the API's (`cast_vote` in
 * artiko-api): the work first (no badge, then another month), then the person (their own work, then a
 * vote already cast in this category this month).
 */
export function voteDisabledReason({ work, month, voter }: VoteQuestion): VoteDisabledReason | null {
  if (!work.human_proven) return "not_eligible";
  if (work.month !== month) return "not_in_contest";
  if (!voter) return null;
  if (voter.artistId !== null && voter.artistId === work.artist_id) return "own_work";
  if (voter.votes.some((vote) => vote.month === month && vote.category === work.category)) return "already_voted";
  return null;
}

/** Whether the person's vote of the month in this category went to this very work. */
export function votedForWork(work: Pick<Work, "id">, voter: Voter | null, month: string): boolean {
  return voter !== null && voter.votes.some((vote) => vote.month === month && vote.work_id === work.id);
}
