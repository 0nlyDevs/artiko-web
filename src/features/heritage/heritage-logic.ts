import type { Practice } from "@/lib/api";

export type PracticeStatus = Practice["status"];

/** The order of the three counters: the most endangered first, as the API orders the index. */
export const STATUSES: readonly PracticeStatus[] = ["red", "orange", "green"];

/**
 * How many practices carry each status. The status is the API's (`Practice.status`): the web never works it
 * out again from the figures. `GET /practices` has no `limit`: it answers with the whole index, so these
 * counts are complete whenever they are shown.
 */
export function statusCounts(practices: Pick<Practice, "status">[]): Record<PracticeStatus, number> {
  const counts: Record<PracticeStatus, number> = { red: 0, orange: 0, green: 0 };
  for (const practice of practices) counts[practice.status] += 1;
  return counts;
}

/** Learners per master (0 without any master). */
export const succession = (practice: Pick<Practice, "learners" | "practitioners">): number =>
  practice.practitioners ? practice.learners / practice.practitioners : 0;

/** « n learners for 100 masters », as a whole number. */
export const successionPercent = (practice: Pick<Practice, "learners" | "practitioners">): number => Math.round(succession(practice) * 100);

/** The width of the succession bar: full at one learner per master. */
export const successionWidth = (practice: Pick<Practice, "learners" | "practitioners">): string => `${Math.min(succession(practice), 1) * 100}%`;
