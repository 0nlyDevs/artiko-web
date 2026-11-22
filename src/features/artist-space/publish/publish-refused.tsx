"use client";

import { useState, type Ref } from "react";
import { useT } from "@/i18n/locale";
import { Button, Tracker } from "@/lib/ui/kanto";
import { cx } from "@/lib/ui/kanto/cx";
import { categoryLabel } from "@/lib/works/category-label";
import { Headline } from "./publish-frame";
import styles from "./publish.module.css";
import { momentLabel } from "./work-facts";

export interface PublishRefusedProps {
  /** `error.case_id` of the 409 `possible_copy`, or null when the API gave none. */
  caseId: string | null;
  /** Title and art form as typed: nothing exists on the API for a refused work. */
  title: string;
  category: string;
  /** When this browser received the refusal: the API does not date it. */
  at: Date;
  headingRef?: Ref<HTMLHeadingElement>;
  /** Back to the first step, with everything typed. */
  onChooseAnother: () => void;
}

/**
 * Frame R6: the image is too close to another work, nothing was published. The API returns a case number and
 * nothing to follow it with, so the screen says so and lets the artist copy the number.
 */
export function PublishRefused({ caseId, title, category, at, headingRef, onChooseAnother }: PublishRefusedProps) {
  const { t, locale } = useT();
  const [copied, setCopied] = useState<"yes" | "failed" | null>(null);
  const { day, time } = momentLabel(at, locale);

  async function copy() {
    if (!caseId) return;
    try {
      await navigator.clipboard.writeText(caseId);
      setCopied("yes");
    } catch {
      // No clipboard here (permission, old browser): the number can still be selected by hand.
      setCopied("failed");
    }
  }

  return (
    <div className={cx(styles.page, styles.outcome)}>
      <div className={styles.aside}>
        <p className={styles.eyebrow}>{t("publish.refused.eyebrow")}</p>
        <Headline k="publish.refused.headline" headingRef={headingRef} />
        <p className={styles.outcomeText}>{t(caseId ? "publish.refused.text" : "publish.refused.textNoCase")}</p>
        <div className={styles.outcomeActions}>
          <Button onClick={onChooseAnother}>{t("publish.refused.other")}</Button>
          {caseId && (
            <Button variant="secondary" onClick={() => void copy()}>
              {t("publish.refused.copy")}
            </Button>
          )}
        </div>
        <p className={styles.outcomeNote} role="status">
          {copied === "yes" ? t("publish.refused.copied") : copied === "failed" ? t("publish.refused.copyFailed") : ""}
        </p>
      </div>
      <div className={styles.facts}>
        <div className={styles.card} data-tone="refused">
          <p className={styles.cardEyebrow}>
            {caseId ? (
              // The number is one piece: a click selects it whole.
              <>
                {t("publish.refused.case", { id: "" })}
                <span className={styles.caseId}>{caseId}</span>
              </>
            ) : (
              t("publish.refused.caseMissing")
            )}
          </p>
          <p className={styles.cardTitle}>{title.trim() || t("publish.untitled")}</p>
          <p className={styles.cardMeta}>{t("publish.refused.meta", { category: categoryLabel({ id: category }, locale), day, time })}</p>
        </div>
        <Tracker
          steps={[
            { id: "refused", title: t("publish.refused.sent"), detail: t("publish.refused.sentHint"), state: "failed" },
            { id: "follow", title: t("publish.refused.follow"), detail: t("publish.refused.followHint"), state: "upcoming" },
          ]}
        />
      </div>
    </div>
  );
}
