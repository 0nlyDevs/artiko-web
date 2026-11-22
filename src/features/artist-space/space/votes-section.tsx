"use client";

import Link from "next/link";
import { useT } from "@/i18n/locale";
import type { Category, Work } from "@/lib/api";
import { monthLabel } from "@/lib/months";
import { IconCheck } from "@/lib/ui/icons";
import { categoryLabel } from "@/lib/works/category-label";
import { SECTION_ID } from "./space-logic";
import styles from "./space.module.css";

/**
 * My votes of the contest month: one line per vote cast, then the art forms still without one, each a way into
 * Explore. A vote stays a vote when its work can no longer be read. The API has no way to withdraw one.
 */
export function VotesSection({ categories, votes, month }: { categories: Category[]; votes: { category: string; work: Work | null }[]; month: string }) {
  const { t, plural, locale } = useT();
  const label = (id: string) => categoryLabel(categories.find((c) => c.id === id) ?? { id }, locale);
  const unvoted = categories.filter((c) => !votes.some((v) => v.category === c.id));

  return (
    <section id={SECTION_ID.votes} aria-labelledby="space-votes-title" className={styles.section}>
      <div className={styles.sectionHead}>
        <h2 id="space-votes-title" className={styles.sectionLabel}>
          {t("space.tabVotes")} · {monthLabel(month, locale)}
        </h2>
        <Link href="/hall-of-fame" className={styles.headLink}>
          {t("space.toPantheon")}
        </Link>
      </div>
      {votes.length > 0 && (
        <ul aria-labelledby="space-votes-title" className={styles.list}>
          {votes.map((vote) => (
            <li key={vote.category} className={styles.line}>
              <span className={styles.lineTitle}>{label(vote.category)}</span>
              <span className={styles.lineMeta}>
                {vote.work ? t("space.vote.work", { title: vote.work.title, artist: vote.work.artist_name }) : t("space.vote.unreadable")}
                <IconCheck size={14} strokeWidth={2.2} className={styles.check} />
              </span>
              {vote.work && (
                <Link href={`/works/${vote.work.id}`} className={styles.lineLink}>
                  {t("kit.view")}
                  <span className="visually-hidden">, {vote.work.title}</span>
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
      {unvoted.length > 0 && (
        <div className={styles.unvoted}>
          <p id="space-unvoted">{votes.length ? plural("space.unvoted", unvoted.length) : t("space.votes.none")}</p>
          <ul aria-labelledby="space-unvoted">
            {unvoted.map((category) => (
              <li key={category.id}>
                <Link href={`/explore?category=${category.id}`}>{label(category.id)}</Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className={styles.rule}>{t("vote.rule")}</p>
    </section>
  );
}
