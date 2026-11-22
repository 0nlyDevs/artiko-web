import { connection } from 'next/server';
import { listWorks, unwrap } from '@/lib/api';
import type { PublishedWork } from './published-works';
import { toPublishedWorks } from './published-works';

/** Past this, the rooms open with what they have: the API may be asleep or unreachable. */
const READ_TIME_LIMIT_MS = 2500;

/**
 * The works published on the API, read at request time. Passed un-awaited to
 * the shell; it always resolves, with an empty list when the API does not answer.
 */
export async function readPublishedWorks(): Promise<PublishedWork[]> {
  await connection();
  try {
    const works = await listWorks({
      query: { limit: 200 },
      signal: AbortSignal.timeout(READ_TIME_LIMIT_MS),
    }).then(unwrap);
    return toPublishedWorks(works);
  } catch {
    return [];
  }
}
