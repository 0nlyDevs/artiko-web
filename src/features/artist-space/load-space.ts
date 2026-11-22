import { getMe, getWork, listCategories, listExpositions, listMyVotes, listWorks, unwrap, type Category, type Exposition, type Me, type Work } from "@/lib/api";
import { callWithToken } from "@/lib/api-token";
import { currentMonth } from "@/lib/months";
import { MAX_ITEMS, readAll } from "@/lib/paging";

export type Space = {
  me: Me;
  categories: Category[];
  works: Work[];
  /** False when the reading stopped at the cap before a short page: the works shown are then not all of them, and nothing counts them. */
  worksComplete: boolean;
  expositions: Exposition[];
  /** The contest month the votes were asked for (UTC `YYYY-MM`). */
  month: string;
  votes: { category: string; work: Work | null }[];
};

/** Everything my space shows, read as the signed-in person. */
export async function loadSpace(): Promise<Space> {
  const month = currentMonth();
  const [me, categories, myVotes] = await Promise.all([
    callWithToken((auth) => getMe(auth).then(unwrap)),
    listCategories().then(unwrap),
    callWithToken((auth) => listMyVotes({ query: { month }, ...auth }).then(unwrap)),
  ]);
  const artist = me.artist;
  const [works, expositions, voted] = await Promise.all([
    // Every page, since the header counts them. With the token the API also gives the artist the proofs kept for the jury.
    artist ? readAll((page) => callWithToken((auth) => listWorks({ query: { artist_id: artist.id, ...page }, ...auth }).then(unwrap))) : [],
    // The API gives an artist's expositions in one answer, without pages: the list is whole.
    artist ? listExpositions({ query: { artist_id: artist.id } }).then(unwrap) : [],
    // A voted work that cannot be read leaves its row without a work.
    Promise.all(myVotes.map((v) => callWithToken((auth) => getWork({ path: { work_id: v.work_id }, ...auth }).then(unwrap)).catch(() => null))),
  ]);
  return {
    me,
    categories,
    works,
    // readAll ends on a short page, or at its cap: under the cap, the last page read was short.
    worksComplete: works.length < MAX_ITEMS,
    expositions,
    month,
    votes: myVotes.map((v, i) => ({ category: v.category, work: voted[i] })),
  };
}
