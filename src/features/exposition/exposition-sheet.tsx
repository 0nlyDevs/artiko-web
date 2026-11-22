"use client";

import Link from "next/link";
import { useT } from "@/i18n/locale";
import { intlLocale, type Locale } from "@/i18n/locales";
import type { Exposition, Work } from "@/lib/api";
import { IconForward } from "@/lib/ui/icons";
import { ButtonLink } from "@/lib/ui/kanto";
import { WorkTile } from "@/lib/works/work-tile";
import styles from "./exposition.module.css";

/** The day an exposition was created, read in UTC like every date of the API. Empty when the date cannot be read. */
export function createdDay(createdAt: string, locale: Locale): string {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(intlLocale(locale), { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

export interface ExpositionSheetProps {
  exposition: Exposition;
  works: Work[];
  /** False when `works` is not the whole exposition: the page says so and counts nothing itself. */
  complete?: boolean;
}

/**
 * One exposition, in the direction of Figma frame R11: its name as a headline and its facts on the
 * left, its works on the right. Only what the Exposition schema has: title, description, artist,
 * number of works, date of creation.
 */
export function ExpositionSheet({ exposition, works, complete = true }: ExpositionSheetProps) {
  const { t, locale } = useT();
  const artistHref = `/artists/${exposition.artist_id}`;
  const created = createdDay(exposition.created_at, locale);

  return (
    <article className={`rise ${styles.page}`}>
      <header className={styles.intro}>
        <p className={styles.eyebrow}>
          {t("exposition.label")} · {exposition.artist_name}
        </p>
        <h1 className={styles.title}>{exposition.title}</h1>
        {exposition.description && <p className={styles.description}>{exposition.description}</p>}
        <dl className={styles.facts} aria-label={t("exposition.facts")}>
          <div className={styles.fact}>
            <dt>{t("artist.label")}</dt>
            <dd>
              <Link href={artistHref} className={styles.link}>
                {exposition.artist_name}
              </Link>
            </dd>
          </div>
          <div className={styles.fact}>
            <dt>{t("artist.works")}</dt>
            {/* `works_count` is the API's own count of the exposition. */}
            <dd>{exposition.works_count}</dd>
          </div>
          {created && (
            <div className={styles.fact}>
              <dt>{t("exposition.created")}</dt>
              <dd>
                <time dateTime={exposition.created_at}>{created}</time>
              </dd>
            </div>
          )}
        </dl>
        <div className={styles.actions}>
          <ButtonLink href={artistHref} variant="secondary" className={styles.action}>
            {t("exposition.artistPage", { artist: exposition.artist_name })}
          </ButtonLink>
          {works.length > 0 && (
            <Link href={`${artistHref}/museum`} className={styles.more}>
              {t("museum.walk")}
              <IconForward size={14} />
            </Link>
          )}
        </div>
      </header>

      <section className={styles.works} aria-labelledby="exposition-works">
        <h2 id="exposition-works" className={styles.label}>
          {t("exposition.worksTitle")}
          {complete && works.length > 0 && <> · {works.length}</>}
        </h2>
        {works.length > 0 ? (
          <div className={styles.grid}>
            {works.map((work, i) => (
              <WorkTile key={work.id} work={work} index={i} sizes="(min-width: 1024px) 22vw, (min-width: 640px) 33vw, 50vw" />
            ))}
          </div>
        ) : (
          <p className={styles.empty}>{t("exposition.empty")}</p>
        )}
        {!complete && <p className={styles.partial}>{t("exposition.partial", { shown: works.length, total: exposition.works_count })}</p>}
      </section>
    </article>
  );
}
