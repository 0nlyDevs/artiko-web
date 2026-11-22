"use client";

import type { Category, CategoryId } from "@/lib/api";
import { useT } from "@/i18n/locale";
import { SlidingChips } from "@/lib/ui/sliding-chips";
import { CategoryLabel } from "@/lib/works/category-label";

/** `/explore` with the given filters; unset ones stay out of the address. */
export function exploreHref(filters: { category?: string; month?: string; q?: string }): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
  const query = params.toString();
  return query ? `/explore?${query}` : "/explore";
}

export function ExploreCategories({
  categories,
  filters,
}: {
  categories: Category[];
  filters: { category?: CategoryId; month?: string; q: string };
}) {
  const { t } = useT();
  const keep = { month: filters.month, q: filters.q };
  return (
    <SlidingChips
      label={t("explore.categories")}
      chips={[
        { key: "all", href: exploreHref(keep), label: t("explore.all"), current: !filters.category },
        ...categories.map((c) => ({
          key: c.id,
          href: exploreHref({ ...keep, category: c.id }),
          label: <CategoryLabel category={c} />,
          current: c.id === filters.category,
        })),
      ]}
    />
  );
}
