import type { ReactNode } from "react";
import type { Key } from "@/i18n/en";
import { T } from "@/i18n/locale";
import styles from "@/kanto/components/tracker/Tracker.module.css";
import { cx } from "./cx";

export type TrackerState = "done" | "active" | "upcoming" | "failed";

export interface TrackerStep {
  /** Identifies the step in the list. */
  id: string;
  title: ReactNode;
  detail?: ReactNode;
  state: TrackerState;
}

const STATE: Record<TrackerState, Key> = {
  done: "kit.tracker.done",
  active: "kit.tracker.active",
  failed: "kit.tracker.failed",
  upcoming: "kit.tracker.upcoming",
};

/** Figma tracker of the deposit (« Reçue → En relecture → Accrochée »): same drawing as KANTO's, its states read in three languages. */
export function Tracker({ steps, className }: { steps: readonly TrackerStep[]; className?: string }) {
  return (
    <ol className={cx(styles.list, className)}>
      {steps.map((step) => (
        <li key={step.id} className={cx(styles.item, styles[step.state])} aria-current={step.state === "active" ? "step" : undefined}>
          <span className={styles.dot} aria-hidden="true">
            {step.state === "done" ? "✓" : step.state === "failed" ? "!" : ""}
          </span>
          <span className={styles.text}>
            <span className={styles.title}>
              {step.title}
              <span className="visually-hidden">
                {" ("}
                <T k={STATE[step.state]} />
                {")"}
              </span>
            </span>
            {step.detail !== undefined && <span className={styles.detail}>{step.detail}</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}
