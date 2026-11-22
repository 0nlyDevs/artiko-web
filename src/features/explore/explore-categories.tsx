"use client";

import type { Category, CategoryId } from "@/lib/api";
import { useT } from "@/i18n/locale";
import { exploreHref } from "@/features/explore/explore-logic";
import { SlidingChips } from "@/lib/ui/sliding-chips";
import { CategoryLabel } from "@/lib/works/category-label";

/** The art forms as chips: « All », then the categories the API gives. The month and the searched text are kept. */
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
