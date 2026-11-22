/** The three badges a work can wear. */
export type BadgeState = "human" | "ai" | "none";

/**
 * The badge of a work, from the two fields the API gives: proven human-made wins, then the artist's own
 * declaration of AI assistance, and otherwise no proof yet.
 */
export function badgeState(work: { human_proven: boolean; ai_declared: boolean }): BadgeState {
  if (work.human_proven) return "human";
  return work.ai_declared ? "ai" : "none";
}
