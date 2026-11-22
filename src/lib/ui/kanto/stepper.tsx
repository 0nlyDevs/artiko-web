"use client";

import type { ReactNode } from "react";
import { useT } from "@/i18n/locale";
import styles from "@/kanto/components/stepper/Stepper.module.css";
import { cx } from "./cx";

export interface StepperStep {
  /** Identifies the step in the list. */
  id: string;
  /** Read aloud in « Modifier l’étape … », so a plain string. */
  label: string;
  /** Drawn in place of `label` when it needs markup. */
  display?: ReactNode;
}

export interface StepperProps {
  steps: readonly StepperStep[];
  /** Zero-based current step. */
  current: number;
  /** Lets the person go back to a completed step. */
  onEdit?: (index: number) => void;
  className?: string;
}

/** Figma stepper of the publication: numbered steps, a check once done, « Modifier » on completed ones. Same drawing as KANTO's, in three languages. */
export function Stepper({ steps, current, onEdit, className }: StepperProps) {
  const { t } = useT();
  return (
    <ol className={cx(styles.list, className)} aria-label={t("kit.steps")}>
      {steps.map((step, index) => {
        const done = index < current;
        const isCurrent = index === current;
        return (
          <li key={step.id} className={cx(styles.step, done && styles.done, isCurrent && styles.current)} aria-current={isCurrent ? "step" : undefined}>
            <span className={styles.number} aria-hidden="true">
              {done ? "✓" : String(index + 1).padStart(2, "0")}
            </span>
            <span className={styles.label}>{step.display ?? step.label}</span>
            {done && onEdit !== undefined && (
              <button type="button" className={styles.edit} onClick={() => onEdit(index)} aria-label={t("kit.step.editAria", { step: step.label })}>
                {t("kit.step.edit")}
              </button>
            )}
          </li>
        );
      })}
    </ol>
  );
}
