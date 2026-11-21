import { describe, expect, it } from "vitest";
import { en } from "./en";
import { DEFAULT_LOCALE, dictionaries, format, LOCALES, matchLocale, pluralKey } from "./locales";

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("dictionaries", () => {
  for (const locale of LOCALES) {
    it(`${locale} has exactly the keys of English, none empty`, () => {
      const dictionary = dictionaries[locale];
      expect(Object.keys(dictionary).sort()).toEqual(Object.keys(en).sort());
      expect(Object.entries(dictionary).filter(([, text]) => !text.trim())).toEqual([]);
    });

    it(`${locale} keeps the {placeholders} of English`, () => {
      const broken = Object.keys(en).filter(
        (key) => placeholders(dictionaries[locale][key as keyof typeof en]).join() !== placeholders(en[key as keyof typeof en]).join(),
      );
      expect(broken).toEqual([]);
    });
  }
});

describe("matchLocale", () => {
  it("takes the first supported browser language, ignoring the region", () => {
    expect(matchLocale(["de-DE", "fr-FR", "mg"])).toBe("fr");
    expect(matchLocale(["MG"])).toBe("mg");
  });

  it("falls back to English", () => {
    expect(matchLocale([])).toBe(DEFAULT_LOCALE);
    expect(matchLocale(["ja", "de"])).toBe(DEFAULT_LOCALE);
  });
});

describe("format", () => {
  it("fills named variables and leaves unknown ones visible", () => {
    expect(format("{n} works by {artist}", { n: 3, artist: "Rova" })).toBe("3 works by Rova");
    expect(format("hello {missing}", { other: 1 })).toBe("hello {missing}");
    expect(format("no variables")).toBe("no variables");
  });
});

describe("pluralKey", () => {
  it("picks the .one or .other form with the locale's rules", () => {
    const keys = Object.keys(en).filter((key) => key.endsWith(".one"));
    expect(keys.length).toBeGreaterThan(0);
    const base = keys[0].slice(0, -".one".length) as Parameters<typeof pluralKey>[1];
    expect(pluralKey("en", base, 1)).toBe(`${base}.one`);
    expect(pluralKey("en", base, 2)).toBe(`${base}.other`);
    expect(pluralKey("fr", base, 0)).toBe(`${base}.one`);
  });
});
