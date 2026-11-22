"use client";

import type { ReactNode, Ref } from "react";
import type { Key } from "@/i18n/en";
import { useT } from "@/i18n/locale";
import { Stepper } from "@/lib/ui/kanto";
import styles from "./publish.module.css";

/** A display headline whose last words take the accent: `Confiez votre œuvre <accent>au musée.</accent>`. */
export function Headline({ k, headingRef }: { k: Key; headingRef?: Ref<HTMLHeadingElement> }) {
  const { rich } = useT();
  return (
    <h1 ref={headingRef} tabIndex={-1} className={styles.headline}>
      {rich(k, { accent: (text) => <span className={styles.accent}>{text}</span> })}
    </h1>
  );
}

export interface PublishFrameProps {
  /** 1: the work. 2: proofs and publication. */
  step: 1 | 2;
  /** Takes the focus when the step changes, so the new screen is announced from its top. */
  headingRef?: Ref<HTMLHeadingElement>;
  /** Back to the first step from the second, through « Modifier ». */
  onEdit?: () => void;
  /** What stays in sight under the steps: the recap of the work on the second step. */
  recap?: ReactNode;
  children: ReactNode;
}

/** The two columns of frames R1 and R2: the headline, the lede and the steps on the left, the fields on the right. */
export function PublishFrame({ step, headingRef, onEdit, recap, children }: PublishFrameProps) {
  const { t } = useT();
  return (
    <div className={styles.page}>
      <div className={styles.aside}>
        <p className={styles.eyebrow}>{t("publish.eyebrow", { n: step })}</p>
        <Headline k={step === 1 ? "publish.work.headline" : "publish.proofs.headline"} headingRef={headingRef} />
        <p className={styles.lede}>{t(step === 1 ? "publish.work.lede" : "publish.proofs.lede")}</p>
        <Stepper
          className={styles.steps}
          steps={[
            { id: "work", label: t("publish.step.work") },
            { id: "proofs", label: t("publish.step.proofs") },
          ]}
          current={step - 1}
          onEdit={onEdit ? () => onEdit() : undefined}
        />
        {recap}
      </div>
      <div className={styles.main}>{children}</div>
    </div>
  );
}

/** « 01 — Le fichier de l’œuvre »: the numbered label over each block of a step. */
export function SectionLabel({ n, id, children }: { n: number; id?: string; children: ReactNode }) {
  return (
    <h2 className={styles.sectionLabel}>
      <span className={styles.sectionNumber}>{String(n).padStart(2, "0")}</span>
      <span aria-hidden="true">—</span>
      {/* The id is on the words alone: they name the section, without its number. */}
      <span id={id}>{children}</span>
    </h2>
  );
}
