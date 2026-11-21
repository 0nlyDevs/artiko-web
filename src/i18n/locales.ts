import { en, type Dictionary, type Key } from "./en";
import { fr } from "./fr";
import { mg } from "./mg";

export type Locale = "en" | "fr" | "mg";

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALES: readonly Locale[] = ["en", "fr", "mg"];

/** Each language is named in itself, whatever the active locale. */
export const LOCALE_NAMES: Record<Locale, string> = { en: "English", fr: "Français", mg: "Malagasy" };

export const dictionaries: Record<Locale, Dictionary> = { en, fr, mg };

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** The first browser language we support (`fr-FR` counts as `fr`), or English. */
export function matchLocale(languages: readonly string[]): Locale {
  for (const language of languages) {
    const base = language.toLowerCase().split("-")[0];
    if (isLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}

export type Vars = Record<string, string | number>;

export function format(template: string, vars?: Vars): string {
  return vars ? template.replace(/\{(\w+)\}/g, (whole, name: string) => (name in vars ? String(vars[name]) : whole)) : template;
}

/** Plural-aware key: `base.one` / `base.other`, picked with the locale's own rules. */
export type PluralBase = Key extends infer K ? (K extends `${infer B}.one` ? B : never) : never;

export function pluralKey(locale: Locale, base: PluralBase, n: number): Key {
  return `${base}.${new Intl.PluralRules(locale).select(n) === "one" ? "one" : "other"}` as Key;
}

/** Locale tag for `Intl`, falling back to English where the runtime has no data for it. */
export function intlLocale(locale: Locale): string {
  return Intl.DateTimeFormat.supportedLocalesOf(locale).length ? locale : DEFAULT_LOCALE;
}
