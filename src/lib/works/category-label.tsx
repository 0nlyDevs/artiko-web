"use client";

import type { Category } from "@/lib/api";
import { useT } from "@/i18n/locale";

/** An art form's name in the active language. The API sends English labels: they stay the fallback. */
export function CategoryLabel({ category }: { category: Pick<Category, "id" | "label"> }) {
  const { t } = useT();
  return category.id ? t(`category.${category.id}`) : category.label;
}
