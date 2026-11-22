"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { useT } from "@/i18n/locale";
import { exploreHref, QUERY_MAX, type ExploreView } from "@/features/explore/explore-logic";
import { monthLabel } from "@/lib/months";
import { IconSearch } from "@/lib/ui/icons";
import { UnderlinedField } from "@/lib/ui/kanto";
import styles from "./explore.module.css";

/**
 * Search box and month picker side by side; typing filters after a short pause, Enter right away.
 * The list of artists has no month: there the picker is left out and the search stays.
 */
export function ExploreFilters({ q, month, months, category, view = "works" }: { q: string; month?: string; months: string[]; category?: string; view?: ExploreView }) {
  const { t, locale } = useT();
  const router = useRouter();
  const [text, setText] = useState(q);
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const go = (next: { q?: string; month?: string }, replace = false) => {
    const href = exploreHref({ category, month, q, view, ...next });
    startTransition(() => (replace ? router.replace(href, { scroll: false }) : router.push(href, { scroll: false })));
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <div className={styles.filters}>
      <form
        role="search"
        className={styles.search}
        onSubmit={(e) => {
          e.preventDefault();
          clearTimeout(timer.current);
          go({ q: text.trim() });
        }}
      >
        <UnderlinedField
          id="explore-q"
          type="search"
          label={t("explore.search")}
          value={text}
          maxLength={QUERY_MAX}
          placeholder={t("explore.searchPlaceholder")}
          enterKeyHint="search"
          onChange={(e) => {
            setText(e.target.value);
            clearTimeout(timer.current);
            const value = e.target.value.trim();
            timer.current = setTimeout(() => go({ q: value }, true), 400);
          }}
          trailing={pending ? <span aria-hidden="true" className={styles.spinner} /> : <IconSearch size={18} className={styles.searchIcon} />}
        />
      </form>
      {view === "works" && (
        <UnderlinedField as="select" label={t("explore.month")} value={month ?? ""} onChange={(e) => go({ month: e.target.value })} className={styles.month}>
          <option value="">{t("explore.anyMonth")}</option>
          {months.map((m) => (
            <option key={m} value={m}>
              {capitalised(monthLabel(m, locale), locale)}
            </option>
          ))}
        </UnderlinedField>
      )}
    </div>
  );
}

/** « novembre 2026 » opens with a capital in a list, as a line of its own. */
const capitalised = (label: string, locale: string) => label.charAt(0).toLocaleUpperCase(locale) + label.slice(1);
