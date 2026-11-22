"use client";

import Image from "next/image";
import Link from "next/link";
import { useT } from "@/i18n/locale";
import { isWebLink, VERDICT_BADGE } from "@/features/scan/scan-logic";
import type { ScanResult } from "@/lib/api";
import { BadgeLabel, ButtonLink } from "@/lib/ui/kanto";
import styles from "./scan.module.css";

/** What the API answered about a photo: the verdict, the work it found, its note and its sources. */
export function ScanAnswer({ result }: { result: ScanResult }) {
  const { t } = useT();
  const confidence = t("scan.confidence", { percent: Math.round(result.confidence * 100) });
  return (
    <div className={`rise ${styles.verdict}`} data-status={result.status}>
      <div className={styles.card}>
        <p className={styles.cardLabel}>
          <BadgeLabel state={VERDICT_BADGE[result.status]}>{t(`scan.${result.status}`)}</BadgeLabel>
        </p>

        {result.work && (
          <div className={styles.found}>
            {result.work.media_kind === "image" && (
              <span className={styles.thumb}>
                <Image src={result.work.media_url} alt={t("work.alt", { title: result.work.title, artist: result.work.artist_name })} fill sizes="112px" className="object-cover" />
              </span>
            )}
            <div className={styles.foundBody}>
              <Link href={`/works/${result.work.id}`} className={styles.foundTitle}>
                {result.work.title}
              </Link>
              <p className={styles.foundLine}>{t("scan.by", { artist: result.work.artist_name })}</p>
              <p className={styles.foundMeta}>{confidence}</p>
            </div>
          </div>
        )}

        {result.known && (
          <div className={styles.found}>
            <span className={styles.thumb}>
              <Image src={result.known.image_url} alt={result.known.title} fill sizes="112px" className="object-contain" />
            </span>
            <div className={styles.foundBody}>
              <p className={styles.foundTitle}>{result.known.title}</p>
              <p className={styles.foundLine}>
                {result.known.artist_name}, {result.known.date}. {result.known.museum}.
              </p>
              <p className={styles.foundMeta}>{confidence}</p>
            </div>
          </div>
        )}

        {result.known && <p className={styles.note}>{t("scan.knownNote")}</p>}
        {result.status === "ai_made" && <p className={styles.note}>{t("scan.aiNote")}</p>}
        {result.status === "unknown" && <p className={styles.note}>{t("scan.noMatch")}</p>}
      </div>

      {result.work && (
        <ButtonLink href={`/artists/${result.work.artist_id}`} variant="secondary" className={styles.cta}>
          {t("scan.visit", { artist: result.work.artist_name })}
        </ButtonLink>
      )}
      {result.status === "unknown" && (
        <ButtonLink href="/me?tab=publish" className={styles.cta}>
          {t("explore.publish")}
        </ButtonLink>
      )}

      {result.sources.length > 0 && (
        <div className={styles.sources}>
          <h3 className={styles.sectionLabel}>{t("scan.sources")}</h3>
          <ul>
            {result.sources.map((s) => (
              <li key={s.url + s.label}>
                {isWebLink(s.url) ? (
                  <a href={s.url} target="_blank" rel="noreferrer">
                    {s.label}
                  </a>
                ) : (
                  s.label
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
