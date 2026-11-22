import type { Key } from "@/i18n/en";
import type { Category, CategoryId } from "@/lib/api";

/** The two states of the page: the feed of works (with a row of artists), or every artist in a list. */
export type ExploreView = "works" | "artists";

export type ExploreFilters = { category?: CategoryId; month?: string; q: string; view: ExploreView };

// shortcut: the API has no text search, so the newest works are fetched and filtered here; add a `q`
// parameter to GET /works once the catalogue outgrows this limit. The page says so when the limit is reached.
export const SEARCH_POOL = 200;

/** Artists in the row above the works. */
export const ARTIST_ROW = 12;

/** The page of artists the row is drawn from: the API's own default (`Limit` in openapi.yml), asked by name. */
export const ARTIST_PAGE = 100;

/** The longest text searched. */
export const QUERY_MAX = 100;

type Params = Record<string, string | string[] | undefined>;

const one = (value: string | string[] | undefined) => (typeof value === "string" ? value : "");

/**
 * The filters of an address. An unknown art form counts as « All », a month outside the list as « All months »,
 * and any `view` but `artists` is the feed of works.
 */
export function readFilters(params: Params, categories: Pick<Category, "id">[], months: string[]): ExploreFilters {
  return {
    category: categories.find((c) => c.id === one(params.category))?.id as CategoryId | undefined,
    month: months.includes(one(params.month)) ? one(params.month) : undefined,
    q: readQuery(params),
    view: readView(params),
  };
}

/** The searched text of an address: trimmed, 100 characters at most. */
export const readQuery = (params: Params): string => one(params.q).trim().slice(0, QUERY_MAX);

export const readView = (params: Params): ExploreView => (one(params.view) === "artists" ? "artists" : "works");

/** `/explore` with the given filters; unset ones, and the default view, stay out of the address. */
export function exploreHref(filters: { category?: string; month?: string; q?: string; view?: ExploreView }): string {
  const params = new URLSearchParams();
  for (const key of ["category", "month", "q"] as const) {
    const value = filters[key];
    if (value) params.set(key, value);
  }
  if (filters.view === "artists") params.set("view", "artists");
  const query = params.toString();
  return query ? `/explore?${query}` : "/explore";
}

/**
 * True when a list may be cut: the API gave as many items as were asked for, so there may be more behind.
 * A shorter answer is the whole list, and only then is its length a count worth showing.
 */
export const mayBeCut = (length: number, limit: number): boolean => length >= limit;

/** The sentence of an empty feed, which names the filters that emptied it. */
export function emptyKey(filters: Pick<ExploreFilters, "category" | "month">): Key {
  if (filters.category && filters.month) return "explore.emptyCategoryMonth";
  if (filters.category) return "explore.empty";
  return filters.month ? "explore.emptyMonth" : "explore.emptyAll";
}
