"use client";

import Link from "next/link";
import type { Category, CategoryId } from "@/lib/api";
import { useT } from "@/i18n/locale";
import { monthLabel, shiftMonth } from "@/lib/months";
import { CategoryLabel } from "@/lib/works/category-label";

const link = (c: string, m: string) => `/hall-of-fame?category=${c}&month=${m}`;

/** Category tabs and the month browser. `canGoNext` is decided on the server, where "this month" is read at request time. */
export function HallNav({
  categories,
  category,
  month,
  canGoNext,
}: {
  categories: Category[];
  category: CategoryId;
  month: string;
  canGoNext: boolean;
}) {
  const { t, locale } = useT();
  return (
    <>
      <nav aria-label={t("explore.categories")} className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <Link
            key={c.id}
            href={link(c.id, month)}
            aria-current={c.id === category ? "page" : undefined}
            className="border-2 border-ink px-3 py-1 aria-[current=page]:bg-ink aria-[current=page]:text-paper"
          >
            <CategoryLabel category={c} />
          </Link>
        ))}
      </nav>
      <div className="flex flex-wrap items-center gap-4">
        <Link href={link(category, shiftMonth(month, -1))} className="underline underline-offset-4">
          {t("hall.prev")}
        </Link>
        <h2 className="font-heading text-5xl first-letter:uppercase">{monthLabel(month, locale)}</h2>
        {canGoNext && (
          <Link href={link(category, shiftMonth(month, 1))} className="underline underline-offset-4">
            {t("hall.next")}
          </Link>
        )}
      </div>
    </>
  );
}

export function HallEmpty({ month }: { month: string }) {
  const { t, locale } = useT();
  return <p>{t("hall.empty", { month: monthLabel(month, locale) })}</p>;
}
