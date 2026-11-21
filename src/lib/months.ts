import { intlLocale, type Locale } from "@/i18n/locales";

/** Contest months are UTC `YYYY-MM`, like the API's. */
export function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

/** "November 2026", "novembre 2026"... in the given locale. */
export function monthLabel(month: string, locale: Locale): string {
  return new Date(`${month}-01T00:00:00Z`).toLocaleDateString(intlLocale(locale), {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function shiftMonth(month: string, by: number): string {
  const d = new Date(`${month}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + by);
  return d.toISOString().slice(0, 7);
}
