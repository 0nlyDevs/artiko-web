"use client";

import type { Ref } from "react";
import { useT } from "@/i18n/locale";
import type { Work } from "@/lib/api";
import { monthLabel } from "@/lib/months";
import { Button, ButtonLink, Tracker, type TrackerStep } from "@/lib/ui/kanto";
import { cx } from "@/lib/ui/kanto/cx";
import { categoryLabel } from "@/lib/works/category-label";
import styles from "./publish.module.css";
import { dayLabel, shortFingerprint } from "./work-facts";

/** The sentences the confirmation and the ceremony share. */
export interface DoneCopy {
  eyebrow: string;
  thanks: string;
  lines: readonly [string, string];
  paragraph: string;
}

/** The address of the artist's room, where « Voir dans ma salle » leads. */
export const roomHref = (work: Pick<Work, "artist_id">): string => `/artists/${work.artist_id}/museum`;

/**
 * What the confirmation says, from the work the API returned. The contest is named only for a work that
 * received the badge: without it the API refuses every vote (`not_eligible`).
 */
export function useDoneCopy(work: Work): DoneCopy {
  const { t, locale } = useT();
  return {
    eyebrow: t("publish.done.eyebrow"),
    thanks: t("publish.done.thanks"),
    lines: [t("publish.done.line1"), t("publish.done.line2")],
    paragraph: work.human_proven
      ? t("publish.done.proven", { category: categoryLabel({ id: work.category }, locale), month: monthLabel(work.month, locale) })
      : t("publish.done.plain"),
  };
}

export interface PublishDoneProps {
  work: Work;
  /** The proof files sent with the work: the API returns no count of them. */
  proofsSent: number;
  headingRef?: Ref<HTMLHeadingElement>;
  onAnother: () => void;
}

/**
 * Frame R5: the confirmation, drawn from the 201 answer without another call. A published work can be neither
 * edited nor deleted, so the only actions are to go and see it, or to publish another one.
 */
export function PublishDone({ work, proofsSent, headingRef, onAnother }: PublishDoneProps) {
  const { t, plural, locale } = useT();
  const copy = useDoneCopy(work);
  const category = categoryLabel({ id: work.category }, locale);
  const month = monthLabel(work.month, locale);
  const proofs = plural("publish.done.proofs", proofsSent);

  const steps: TrackerStep[] = [
    { id: "published", title: t("publish.done.published"), detail: t("publish.done.publishedHint"), state: "done" },
    work.human_proven
      ? { id: "badge", title: t("publish.done.badge"), detail: `${proofs} · ${t("publish.done.noAi")}`, state: "done" }
      : {
          id: "badge",
          title: t("publish.done.noBadge"),
          detail: work.ai_declared ? t("publish.done.noBadgeAi") : plural("publish.done.noBadgeProofs", proofsSent),
          state: "upcoming",
        },
    ...(work.human_proven
      ? [{ id: "contest", title: t("publish.done.contest", { month }), detail: `${plural("votes", work.votes)} · ${t("publish.done.contestHint")}`, state: "active" } satisfies TrackerStep]
      : []),
  ];

  return (
    <div className={cx(styles.page, styles.outcome)}>
      <div className={styles.aside}>
        <p className={styles.eyebrow}>{copy.eyebrow}</p>
        <h1 ref={headingRef} tabIndex={-1} className={styles.headline}>
          {/* Three lines as on the frame; the spaces keep them apart in the accessible name. */}
          <span lang="mg" className={styles.line}>
            {copy.thanks}
          </span>{" "}
          <span className={styles.line}>{copy.lines[0]}</span> <span className={styles.line}>{copy.lines[1]}</span>
        </h1>
        <p className={styles.outcomeText}>{copy.paragraph}</p>
        <div className={styles.outcomeActions}>
          <ButtonLink href={roomHref(work)}>{t("publish.done.room")}</ButtonLink>
          <Button variant="secondary" onClick={onAnother}>
            {t("publish.done.another")}
          </Button>
        </div>
      </div>
      <div className={styles.facts}>
        <div className={styles.card}>
          <p className={styles.cardEyebrow}>{t("publish.done.fingerprint", { hash: shortFingerprint(work.sha256) })}</p>
          <p className={styles.cardTitle}>{work.title}</p>
          <p className={styles.cardMeta}>{t("publish.done.meta", { category, artist: work.artist_name, date: dayLabel(work.created_at, locale) })}</p>
        </div>
        <Tracker steps={steps} />
      </div>
    </div>
  );
}
