"use client";

import type { Category } from "@/lib/api";
import type { Key } from "@/i18n/en";
import { useT } from "@/i18n/locale";
import { dictionaries } from "@/i18n/locales";

/** An art form's name in the active language. The API sends English labels: they stay the fallback for a category we have no translation for. */
export function CategoryLabel({ category }: { category: Pick<Category, "id" | "label"> }) {
  const { t, locale } = useT();
  const key = `category.${category.id}`;
  return key in dictionaries[locale] ? t(key as Key) : category.label;
}
