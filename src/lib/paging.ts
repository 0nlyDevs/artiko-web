/** The largest page artiko-api gives (`limit` in openapi.yml). */
export const PAGE_LIMIT = 200;

/** Where readAll stops by default, so a list that keeps growing cannot hold a screen: five pages. */
export const MAX_ITEMS = 1000;

export type Page = { limit: number; offset: number };

/**
 * A whole list, read page by page (`offset += limit`) until a page comes back shorter than `limit`.
 * It stops at `cap` items whatever is left: past it the list is cut, as a single page was before.
 * A `limit` or a `cap` that could not end the reading is refused with a RangeError before any page is read.
 */
export async function readAll<T>(readPage: (page: Page) => Promise<T[]>, { limit = PAGE_LIMIT, cap = MAX_ITEMS } = {}): Promise<T[]> {
  // A page size of 0 or NaN never comes back "shorter than limit", and an endless cap never stops a list that keeps growing.
  if (!Number.isInteger(limit) || limit < 1) throw new RangeError(`readAll: limit must be a whole number of 1 or more, not ${limit}`);
  if (!Number.isFinite(cap)) throw new RangeError(`readAll: cap must be a finite number, not ${cap}`);
  const items: T[] = [];
  for (let offset = 0; items.length < cap; offset += limit) {
    const page = await readPage({ limit, offset });
    items.push(...page);
    if (page.length < limit) break;
  }
  return items.slice(0, cap);
}
