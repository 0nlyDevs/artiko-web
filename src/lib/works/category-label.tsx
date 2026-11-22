"use client";

import type { Key } from "@/i18n/en";
import { useT } from "@/i18n/locale";
import { dictionaries, type Locale } from "@/i18n/locales";

/** An art form as the caller has it: the whole category from the API, or the id alone that a work or a practice carries. */
type Labelled = { id: string; label?: string };

/**
 * An art form's name in `locale`. The API sends English labels: they stay the fallback for a category we have
 * no translation for. Where no label came with the id, such a category has no name to show: an empty text, never the raw id.
 */
export function categoryLabel(category: Labelled, locale: Locale): string {
  const key = `category.${category.id}`;
  return key in dictionaries[locale] ? dictionaries[locale][key as Key] : (category.label ?? "");
}

/** `categoryLabel` in the active language. */
export function CategoryLabel({ category }: { category: Labelled }) {
  return categoryLabel(category, useT().locale);
}
