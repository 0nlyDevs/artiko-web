"use client";

import Link from "next/link";
import type { Category, CategoryId } from "@/lib/api";
import { useT } from "@/i18n/locale";
import { monthLabel, shiftMonth } from "@/lib/months";
import { IconLeft, IconRight } from "@/lib/ui/icons";
import { SlidingChips } from "@/lib/ui/sliding-chips";
import { CategoryLabel } from "@/lib/works/category-label";

const link = (c: string, m: string) => `/hall-of-fame?category=${c}&month=${m}`;
const ROUND = "inline-flex size-11 items-center justify-center rounded-full bg-surface transition-colors hover:bg-[var(--surface-hover)]";

/** Title, month browser and category chips. `canGoNext` is decided on the server, where "this month" is read at request time. */
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
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="max-w-[62ch]">
          <h1 className="text-[32px] leading-none font-extrabold tracking-[-0.04em]">{t("hall.title")}</h1>
          <p className="mt-2.5 leading-relaxed">{t("hall.intro")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={link(category, shiftMonth(month, -1))} aria-label={t("hall.prev")} className={ROUND} scroll={false}>
            <IconLeft size={20} strokeWidth={2} />
          </Link>
          <h2 aria-live="polite" className="min-w-[150px] text-center text-[17px] font-bold first-letter:uppercase">
            {monthLabel(month, locale)}
          </h2>
          {canGoNext ? (
            <Link href={link(category, shiftMonth(month, 1))} aria-label={t("hall.next")} className={ROUND} scroll={false}>
              <IconRight size={20} strokeWidth={2} />
            </Link>
          ) : (
            <span aria-hidden="true" className={`${ROUND} opacity-40`}>
              <IconRight size={20} strokeWidth={2} />
            </span>
          )}
        </div>
      </div>
      <SlidingChips
        label={t("explore.categories")}
        chips={categories.map((c) => ({
          key: c.id,
          href: link(c.id, month),
          label: <CategoryLabel category={c} />,
          current: c.id === category,
        }))}
      />
    </>
  );
}

export function HallEmpty({ month }: { month: string }) {
  const { t, locale } = useT();
  return (
    <div className="rise mt-4 flex flex-col items-center gap-3.5 rounded-md bg-surface px-6 py-16 text-center">
      <p className="max-w-[44ch] text-xl font-bold tracking-[-0.02em]">{t("hall.empty", { month: monthLabel(month, locale) })}</p>
      <Link href="/explore" className="btn btn-ink">
        {t("menu.explore")}
      </Link>
    </div>
  );
}
