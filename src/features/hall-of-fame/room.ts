import type { Category, CategoryId, HallOfFameEntry, Vote } from "@/lib/api";
import { intlLocale, type Locale } from "@/i18n/locales";
import { lastMonths } from "@/lib/months";

/** The room of honour hangs five frames, the size of the API's ranking. */
export const FRAMES = 5;
/** Explore lists the last twelve contest months: an older month cannot be asked of it. */
const EXPLORE_MONTHS = 12;
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

type Param = string | string[] | undefined;

/** The month the address asks for. Anything unreadable, and any month after `now`, is the current month. */
export function resolveMonth(param: Param, now: string): string {
  return typeof param === "string" && MONTH.test(param) && param <= now ? param : now;
}

/** The art form the address asks for, among those the API lists; painting when it names none of them. */
export function resolveCategory(categories: Category[], param: Param): CategoryId {
  return (categories.find((c) => c.id === param)?.id ?? "painting") as CategoryId;
}

export const hallHref = (category: string, month: string) => `/hall-of-fame?category=${category}&month=${month}`;

/** What the address asks for: the art form, the month, and whether a later month exists to go to. */
export type RoomAddress = { category: Category; month: string; canGoNext: boolean };

/**
 * The room an address opens. An art form the API does not list is painting, under its own id when the API
 * lists none; `now` is the current contest month, and a month to come is never offered.
 */
export function readRoom(categories: Category[], params: { category?: Param; month?: Param }, now: string): RoomAddress {
  const id = resolveCategory(categories, params.category);
  const month = resolveMonth(params.month, now);
  return { category: categories.find((c) => c.id === id) ?? { id, label: id }, month, canGoNext: month < now };
}

/**
 * The way from a room to its works in Explore. `current`: the works of the month still open; `month`: those of a
 * closed month; `all`: every work of the art form, because Explore no longer lists a month that old.
 */
export type WorksLink = { href: string; scope: "current" | "month" | "all" };

export function worksLink(category: string, month: string, now: string): WorksLink {
  if (!lastMonths(EXPLORE_MONTHS, now).includes(month)) return { href: `/explore?category=${category}`, scope: "all" };
  return { href: `/explore?category=${category}&month=${month}`, scope: month === now ? "current" : "month" };
}

export type Frame = { rank: number; entry: HallOfFameEntry | null };

/** The five frames of the room, by rank. A rank the API did not send keeps its frame, empty. */
export function hang(entries: HallOfFameEntry[]): Frame[] {
  return Array.from({ length: FRAMES }, (_, i) => ({ rank: i + 1, entry: entries.find((e) => e.rank === i + 1) ?? null }));
}

/** A person's vote in one art form: `GET /votes/mine` answers with every art form of the month. */
export function voteIn(votes: Vote[], category: string): Vote | null {
  return votes.find((v) => v.category === category) ?? null;
}

/** "October", "octobre"... the month alone, for the links to the months around the one shown. */
export function monthName(month: string, locale: Locale): string {
  return new Date(`${month}-01T00:00:00Z`).toLocaleDateString(intlLocale(locale), { month: "long", timeZone: "UTC" });
}
