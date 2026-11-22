"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Category, CategoryId } from "@/lib/api";
import { useT } from "@/i18n/locale";
import { monthLabel, shiftMonth } from "@/lib/months";
import { IconLeft, IconRight } from "@/lib/ui/icons";
import { CategoryLabel, categoryLabel } from "@/lib/works/category-label";
import styles from "./hall-of-fame.module.css";
import { hallHref, monthName } from "./room";

/**
 * The top bar of the room: the month before, the month shown, the month after.
 * `canGoNext` is decided on the server, where "this month" is read at request time: a month to come is never a link.
 */
export function MonthNav({ category, month, canGoNext }: { category: CategoryId; month: string; canGoNext: boolean }) {
  const { t, locale } = useT();
  const before = shiftMonth(month, -1);
  const after = shiftMonth(month, 1);
  return (
    <nav aria-label={t("hall.months")} className={styles.months}>
      <Link href={hallHref(category, before)} scroll={false} className={styles.monthLink}>
        <span className="visually-hidden">{t("hall.prev")}, </span>
        <IconLeft size={14} strokeWidth={2} />
        <span className={styles.monthName}>{monthName(before, locale)}</span>
      </Link>
      <h2 aria-live="polite" className={styles.month}>
        {monthLabel(month, locale)}
      </h2>
      {canGoNext ? (
        <Link href={hallHref(category, after)} scroll={false} className={styles.monthLink}>
          <span className="visually-hidden">{t("hall.next")}, </span>
          <span className={styles.monthName}>{monthName(after, locale)}</span>
          <IconRight size={14} strokeWidth={2} />
        </Link>
      ) : (
        <span aria-hidden="true" className={styles.monthLink} data-disabled="true">
          <span className={styles.monthName}>{monthName(after, locale)}</span>
          <IconRight size={14} strokeWidth={2} />
        </span>
      )}
    </nav>
  );
}

/** The line over the title: the room, its art form, what hangs in it. */
export function RoomEyebrow({ category }: { category: Category }) {
  const { t, locale } = useT();
  return <p className={styles.eyebrow}>{t("hall.eyebrow", { category: categoryLabel(category, locale) })}</p>;
}

/**
 * The bottom bar of the room: one link per art form. The mark moves on click, before the server answers;
 * the server's choice takes over again when it arrives (or on Back).
 */
export function CategoryBar({ categories, category, month }: { categories: Category[]; category: CategoryId; month: string }) {
  const { t } = useT();
  const track = useRef<HTMLElement>(null);
  const [choice, setChoice] = useState({ server: category, picked: null as string | null });
  if (choice.server !== category) setChoice({ server: category, picked: null });
  const active = choice.picked ?? category;

  // On a phone the bar scrolls sideways: keep the chosen art form in view, without moving the page.
  useEffect(() => {
    const bar = track.current;
    const on = bar?.querySelector<HTMLElement>('[aria-current="page"]');
    if (bar && on) bar.scrollTo({ left: on.offsetLeft - (bar.clientWidth - on.offsetWidth) / 2 });
  }, [active]);

  return (
    <nav ref={track} aria-label={t("explore.categories")} className={styles.categories}>
      {categories.map((c) => (
        <Link
          key={c.id}
          href={hallHref(c.id, month)}
          scroll={false}
          aria-current={c.id === active ? "page" : undefined}
          onClick={() => setChoice({ server: category, picked: c.id })}
          className={styles.category}
        >
          <CategoryLabel category={c} />
        </Link>
      ))}
    </nav>
  );
}
