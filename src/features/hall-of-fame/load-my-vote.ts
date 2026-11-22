import { getWork, listMyVotes, unwrap, type HallOfFameEntry } from "@/lib/api";
import { callWithToken } from "@/lib/api-token";
import { voteIn } from "./room";

/** The work a person voted for in a room. `title` is null when the work is not hung and could not be read. */
export type MyVote = { workId: string; title: string | null };

/**
 * The signed-in person's vote in `category` for `month`, or null when they cast none there.
 * A vote carries no title: it comes from the frames of the room, else from the work itself.
 */
export async function loadMyVote(category: string, month: string, entries: HallOfFameEntry[]): Promise<MyVote | null> {
  const votes = await callWithToken((auth) => listMyVotes({ query: { month }, ...auth }).then(unwrap));
  const mine = voteIn(votes, category);
  if (!mine) return null;
  const hung = entries.find((e) => e.work.id === mine.work_id);
  if (hung) return { workId: mine.work_id, title: hung.work.title };
  const title = await getWork({ path: { work_id: mine.work_id } })
    .then(unwrap)
    .then((work) => work.title)
    .catch(() => null);
  return { workId: mine.work_id, title };
}
