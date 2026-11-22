import type { ExpositionIn, Work } from "@/lib/api";

/** The sections of my space, by the name the address gives them (`/me?tab=`). They were tabs before the page became one. */
export type SpaceTab = "works" | "publish" | "votes" | "profile";

const ARTIST_TABS: readonly SpaceTab[] = ["works", "publish", "votes", "profile"];
const VISITOR_TABS: readonly SpaceTab[] = ["profile", "votes"];

/**
 * The section `?tab=` asks for, or null when it asks for none: no parameter, an unknown name, or a section
 * this person does not have (publishing and works need an artist profile). Null shows the page from its top.
 */
export function resolveTab(asked: string | null, isArtist: boolean): SpaceTab | null {
  const tabs = isArtist ? ARTIST_TABS : VISITOR_TABS;
  return tabs.find((tab) => tab === asked) ?? null;
}

/** The element a section's address scrolls to. Publishing has none: it takes the page. */
export const SECTION_ID = { works: "space-works", votes: "space-votes", profile: "space-profile", expositions: "space-expositions" } as const;

export type ContestStatus = "open" | "closed" | "out";

/**
 * Where a work stands in the monthly contest, by the rule of the vote button (src/lib/works/vote.tsx): only a
 * work proven human-made competes, and only during the month it was published. `month` is the current UTC month.
 */
export function contestStatus(work: Pick<Work, "human_proven" | "month">, month: string): ContestStatus {
  if (!work.human_proven) return "out";
  return work.month === month ? "open" : "closed";
}

/** The limits of `ExpositionIn` in the API contract. */
export const EXPOSITION_TITLE_MAX = 200;
export const EXPOSITION_DESCRIPTION_MAX = 2000;

/**
 * The body of a new exposition from what was typed, or the field that breaks the contract: a title of
 * 1 to 200 characters once trimmed, a description of 2,000 at most. An empty description is not sent.
 */
export function expositionBody(input: { title: string; description: string }): { body: ExpositionIn } | { invalid: "title" | "description" } {
  const title = input.title.trim();
  const description = input.description.trim();
  if (title.length < 1 || title.length > EXPOSITION_TITLE_MAX) return { invalid: "title" };
  if (description.length > EXPOSITION_DESCRIPTION_MAX) return { invalid: "description" };
  return { body: description ? { title, description } : { title } };
}

/** The lists after a publication: the new work first, the exposition created with it, and one more work counted in the exposition it joined. */
export function withPublished<W extends Pick<Work, "exposition_id">, E extends { id: string; works_count: number }>(
  lists: { works: W[]; expositions: E[] },
  work: W,
  created: E | null,
): { works: W[]; expositions: E[] } {
  // An exposition created for an earlier try of the same publication is already listed, with its works counted.
  const expositions = created && !lists.expositions.some((e) => e.id === created.id) ? [created, ...lists.expositions] : lists.expositions;
  return {
    works: [work, ...lists.works],
    expositions: expositions.map((e) => (e.id === work.exposition_id ? { ...e, works_count: e.works_count + 1 } : e)),
  };
}
