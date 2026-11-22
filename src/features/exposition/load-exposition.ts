import { notFound } from "next/navigation";
import { ApiError, getExposition, listWorks, unwrap, type Exposition, type Work } from "@/lib/api";
import { MAX_ITEMS, readAll } from "@/lib/paging";

export interface ExpositionRoom {
  exposition: Exposition;
  /** The works hung in the exposition, newest first. */
  works: Work[];
  /** False when the reading stopped at the cap before a short page: the works shown are then not all of them. */
  complete: boolean;
}

/** One exposition (`GET /expositions/{id}`). An id the API does not know (404), or that is not an id (422), is not found. */
export async function loadExposition(id: string): Promise<Exposition> {
  try {
    return unwrap(await getExposition({ path: { exposition_id: id } }));
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 422)) notFound();
    throw e;
  }
}

/**
 * An exposition and its works: `GET /works?exposition_id=`, every page down to a short one. Public
 * reads, without a token. A failed read of the works is an error of the page, not an empty exposition.
 */
export async function loadExpositionRoom(id: string): Promise<ExpositionRoom> {
  const exposition = await loadExposition(id);
  const works = await readAll((page) => listWorks({ query: { exposition_id: exposition.id, ...page } }).then(unwrap));
  // readAll ends on a short page, or at its cap: under the cap, the last page read was short.
  return { exposition, works, complete: works.length < MAX_ITEMS };
}
