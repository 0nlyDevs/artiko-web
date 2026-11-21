"use client";

import Link from "next/link";
import type { Category, CategoryId } from "@/lib/api";
import { useT } from "@/i18n/locale";
import { CategoryLabel } from "@/lib/works/category-label";

const CHIP = "border-2 border-ink px-3 py-1 aria-[current=page]:bg-ink aria-[current=page]:text-paper";

export function ExploreCategories({ categories, selected }: { categories: Category[]; selected: CategoryId | undefined }) {
  const { t } = useT();
  return (
    <nav aria-label={t("explore.categories")} className="flex flex-wrap gap-2">
      <Link href="/explore" aria-current={selected === undefined ? "page" : undefined} className={CHIP}>
        {t("explore.all")}
      </Link>
      {categories.map((c) => (
        <Link key={c.id} href={`/explore?category=${c.id}`} aria-current={c.id === selected ? "page" : undefined} className={CHIP}>
          <CategoryLabel category={c} />
        </Link>
      ))}
    </nav>
  );
}
