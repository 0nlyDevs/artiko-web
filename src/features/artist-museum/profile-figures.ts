import type { Work } from "@/lib/api";

/** What the profile counts on the artist's works: how many, their votes, how many carry the human-made badge. */
export interface ProfileFigures {
  works: number;
  votes: number;
  proven: number;
}

/**
 * The figures of an artist's profile, or null when the list of works is not known whole. The API sends no
 * total: a number is only true when every page was read down to a short one (`readAll` under its cap).
 * A number counted on a part of the list would be wrong, so none is shown then.
 */
export function profileFigures(works: readonly Pick<Work, "votes" | "human_proven">[], complete: boolean): ProfileFigures | null {
  if (!complete) return null;
  return {
    works: works.length,
    votes: works.reduce((sum, work) => sum + work.votes, 0),
    proven: works.filter((work) => work.human_proven).length,
  };
}
