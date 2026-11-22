import { intlLocale, type Locale } from "@/i18n/locales";
import type { Work } from "@/lib/api";

/**
 * The day a work was published, read in UTC like its contest month (`Work.month`): in local time a work
 * published on 30 November at 22:30 UTC would show « 1 décembre » beside « concours de novembre ».
 */
export function publishedDay(createdAt: string, locale: Locale): string {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(intlLocale(locale), { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/** A contest month (`YYYY-MM`) by its name alone: « novembre ». */
export function monthName(month: string, locale: Locale): string {
  return new Date(`${month}-01T00:00:00Z`).toLocaleDateString(intlLocale(locale), { month: "long", timeZone: "UTC" });
}

/** French elides « de » before a vowel: « concours d’octobre », « concours de novembre ». */
export function elides(locale: Locale, word: string): boolean {
  return locale === "fr" && /^[aeiouyàâéèêîôûh]/i.test(word);
}

/** A SHA-256 as the frame writes it: the first and last four characters. */
export function shortHash(sha256: string): string {
  return sha256.length > 8 ? `${sha256.slice(0, 4)}…${sha256.slice(-4)}` : sha256;
}

/** « 01 », « 12 », « 104 ». */
export const twoDigits = (n: number) => String(n).padStart(2, "0");

export interface RoomPlace {
  /** 1 for the first work of the room. */
  position: number;
  /** How many works the room holds, or null when it may hold more than the page that was read. */
  total: number | null;
  next: { id: string; title: string } | null;
}

/**
 * Where a work hangs in its room, from one page of `GET /works?category=` (newest first). The API sends
 * no total: the room is only known whole when the page came back shorter than `limit`. Then the last
 * work leads back to the first; otherwise the walk stops at the end of the page.
 */
export function roomPlace(works: readonly Pick<Work, "id" | "title">[], workId: string, limit: number): RoomPlace | null {
  const index = works.findIndex((work) => work.id === workId);
  if (index < 0) return null;
  const whole = works.length < limit;
  const after = works[index + 1] ?? (whole && works.length > 1 ? works[0] : undefined);
  return { position: index + 1, total: whole ? works.length : null, next: after ? { id: after.id, title: after.title } : null };
}
