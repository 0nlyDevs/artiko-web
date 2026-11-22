"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { useT } from "@/i18n/locale";
import { exploreHref } from "@/features/explore/explore-categories";
import { monthLabel } from "@/lib/months";
import { IconCalendar, IconSearch } from "@/lib/ui/icons";

/** Search box and month picker side by side; typing filters after a short pause, Enter right away. */
export function ExploreFilters({ q, month, months, category }: { q: string; month?: string; months: string[]; category?: string }) {
  const { t, locale } = useT();
  const router = useRouter();
  const [text, setText] = useState(q);
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const go = (next: { q?: string; month?: string }, replace = false) => {
    const href = exploreHref({ category, month, q, ...next });
    startTransition(() => (replace ? router.replace(href, { scroll: false }) : router.push(href, { scroll: false })));
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <>
      <form
        role="search"
        className="flex min-h-12 min-w-0 flex-[1_1_280px] items-center gap-3 rounded-full bg-surface px-5 sm:max-w-[620px]"
        onSubmit={(e) => {
          e.preventDefault();
          clearTimeout(timer.current);
          go({ q: text.trim() });
        }}
      >
        <IconSearch size={20} strokeWidth={2} className="shrink-0 text-muted" />
        <label htmlFor="explore-q" className="sr-only">
          {t("explore.search")}
        </label>
        <input
          id="explore-q"
          type="search"
          value={text}
          maxLength={100}
          placeholder={t("explore.searchPlaceholder")}
          onChange={(e) => {
            setText(e.target.value);
            clearTimeout(timer.current);
            const value = e.target.value.trim();
            timer.current = setTimeout(() => go({ q: value }, true), 400);
          }}
          className="h-12 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted"
        />
        {pending && <span aria-hidden="true" className="spin shrink-0 border-ink/20 border-t-ink" />}
      </form>
      <label className="relative flex min-h-12 shrink-0 items-center rounded-full bg-white shadow-[inset_0_0_0_1.5px_var(--line)]">
        <span className="sr-only">{t("explore.month")}</span>
        <IconCalendar size={18} className="pointer-events-none absolute left-4 text-ink" />
        <select
          value={month ?? ""}
          onChange={(e) => go({ month: e.target.value })}
          className="input h-12 bg-transparent pl-11 font-semibold first-letter:uppercase"
        >
          <option value="">{t("explore.anyMonth")}</option>
          {months.map((m) => (
            <option key={m} value={m}>
              {monthLabel(m, locale)}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
