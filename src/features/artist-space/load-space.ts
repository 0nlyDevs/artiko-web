import { getMe, getWork, listCategories, listExpositions, listMyVotes, listWorks, unwrap, type Category, type Exposition, type Me, type Work } from "@/lib/api";
import { callWithToken } from "@/lib/api-token";
import { readAll } from "@/lib/paging";

export type Space = { me: Me; categories: Category[]; works: Work[]; expositions: Exposition[]; votes: { category: string; work: Work | null }[] };

/** Everything my space shows, read as the signed-in person. */
export async function loadSpace(): Promise<Space> {
  const [me, categories, myVotes] = await Promise.all([
    callWithToken((auth) => getMe(auth).then(unwrap)),
    listCategories().then(unwrap),
    callWithToken((auth) => listMyVotes(auth).then(unwrap)),
  ]);
  const artist = me.artist;
  const [works, expositions, voted] = await Promise.all([
    // Every page, since the header counts them. With the token the API also gives the artist the proofs kept for the jury.
    artist ? readAll((page) => callWithToken((auth) => listWorks({ query: { artist_id: artist.id, ...page }, ...auth }).then(unwrap))) : [],
    artist ? listExpositions({ query: { artist_id: artist.id } }).then(unwrap) : [],
    // A voted work that cannot be read leaves its row without a work.
    Promise.all(myVotes.map((v) => callWithToken((auth) => getWork({ path: { work_id: v.work_id }, ...auth }).then(unwrap)).catch(() => null))),
  ]);
  return { me, categories, works, expositions, votes: myVotes.map((v, i) => ({ category: v.category, work: voted[i] })) };
}
