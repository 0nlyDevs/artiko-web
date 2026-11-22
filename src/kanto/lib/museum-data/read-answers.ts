import type { Artist, Category } from '@/lib/api';
import type { PlanAnswers, Read } from './plan';
import { ARTIST_CHIPS, CONTRACT_CATEGORIES } from './plan';

/** The three public reads of the plan. Each rejects when the API gives no usable answer. */
export interface PlanApi {
  categories: (signal: AbortSignal) => Promise<readonly Category[]>;
  /** GET /works?category=<id>&limit=1. */
  firstWork: (
    categoryId: string,
    signal: AbortSignal,
  ) => Promise<readonly unknown[]>;
  /** GET /artists?limit=<limit>, sorted by name by the API. */
  artists: (limit: number, signal: AbortSignal) => Promise<readonly Artist[]>;
}

/** Rejects when `signal` aborts. Its rejection is always observed, so it never surfaces as unhandled. */
function cutShort(signal: AbortSignal): Promise<never> {
  const cut = new Promise<never>((_, reject) => {
    const stop = (): void => {
      reject(new Error('The time limit of the read was reached.'));
    };
    if (signal.aborted) {
      stop();
      return;
    }
    signal.addEventListener('abort', stop, { once: true });
  });
  cut.catch(() => undefined);
  return cut;
}

/**
 * Asks the API for everything the plan shows and never rejects: a call that
 * fails, or that `signal` cuts short, comes back as `{ ok: false }`.
 * The categories and the artists are read together, then one probe per
 * category. Without the list of categories the art forms of the contract are
 * probed instead, so one failed call does not blank the eight rooms.
 *
 * `signal` is the time limit. Each call receives it to stop its request, and
 * the wait itself ends with it: a call that ignores the signal cannot hold
 * the plan back.
 */
export async function readPlanAnswers(
  api: PlanApi,
  signal: AbortSignal,
): Promise<PlanAnswers> {
  const cut = cutShort(signal);
  async function attempt<T>(call: () => Promise<T>): Promise<Read<T>> {
    if (signal.aborted) {
      return { ok: false };
    }
    try {
      return { ok: true, value: await Promise.race([call(), cut]) };
    } catch {
      return { ok: false };
    }
  }

  const [categories, artists] = await Promise.all([
    attempt(() => api.categories(signal)),
    attempt(() => api.artists(ARTIST_CHIPS, signal)),
  ]);
  const toProbe = categories.ok ? categories.value : CONTRACT_CATEGORIES;
  const probes = await Promise.all(
    toProbe.map(
      async (category) =>
        [
          category.id,
          await attempt(() => api.firstWork(category.id, signal)),
        ] as const,
    ),
  );
  return { categories, probes: new Map(probes), artists };
}
