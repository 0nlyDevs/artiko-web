import { intlLocale, type Locale } from "@/i18n/locales";

/** The SHA-256 of the published file, shortened as on the confirmation frame: « 3F9A…C21E ». */
export function shortFingerprint(sha256: string): string {
  const hex = sha256.trim().toUpperCase();
  return hex.length <= 8 ? hex : `${hex.slice(0, 4)}…${hex.slice(-4)}`;
}

/** « 22 novembre 2026 »: the day of an API timestamp, read in UTC like the contest month. */
export function dayLabel(iso: string, locale: Locale): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(intlLocale(locale), { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/** « 22 novembre 2026 à 03:41 »: a moment of this browser, for a refusal the API does not date. */
export function momentLabel(date: Date, locale: Locale): { day: string; time: string } {
  const tag = intlLocale(locale);
  return {
    day: date.toLocaleDateString(tag, { day: "numeric", month: "long", year: "numeric" }),
    time: date.toLocaleTimeString(tag, { hour: "2-digit", minute: "2-digit" }),
  };
}
