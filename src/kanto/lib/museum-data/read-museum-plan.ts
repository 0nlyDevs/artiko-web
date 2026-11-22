import { connection } from 'next/server';
import type { CategoryId } from '@/lib/api';
import { listArtists, listCategories, listWorks, unwrap } from '@/lib/api';
import type { MuseumPlan } from './plan';
import { buildMuseumPlan } from './plan';
import type { PlanApi } from './read-answers';
import { readPlanAnswers } from './read-answers';

/**
 * How long the whole read may take. The hosted API sleeps when idle and then
 * needs far longer than this to answer its first call: the plan is drawn
 * without it, and the next page load finds it awake.
 */
export const READ_TIME_LIMIT_MS = 2500;

// Public GET only, no token. They run on the server because the API accepts
// browser calls from its own list of origins.
const api: PlanApi = {
  categories: (signal) => listCategories({ signal }).then(unwrap),
  firstWork: (categoryId, signal) =>
    listWorks({
      // An id that came from GET /categories, or from the contract.
      query: { category: categoryId as CategoryId, limit: 1 },
      signal,
    }).then(unwrap),
  artists: (limit, signal) =>
    listArtists({ query: { limit }, signal }).then(unwrap),
};

/**
 * The museum plan, read at request time. Meant to be passed un-awaited to
 * the KANTO shell, which streams it: the page never waits for it. It always
 * resolves, within `READ_TIME_LIMIT_MS`, with what the API answered by then.
 */
export async function readMuseumPlan(): Promise<MuseumPlan> {
  // Nothing is read while the page is prerendered: the state of the rooms belongs to the request.
  await connection();
  const answers = await readPlanAnswers(
    api,
    AbortSignal.timeout(READ_TIME_LIMIT_MS),
  );
  return buildMuseumPlan(answers);
}
