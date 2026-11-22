import type { ReactNode } from "react";
import { T } from "@/i18n/locale";
import styles from "@/kanto/components/status-banner/StatusBanner.module.css";
import { cx } from "./cx";

export type BannerTone = "info" | "error" | "success" | "warning";

export interface StatusBannerProps {
  tone?: BannerTone;
  children: ReactNode;
  /** A support reference shown under the message, for example the `case_id` of a refusal. */
  reference?: string | null;
  /** A recovery action on the right. With it the banner must be rendered by a client component. */
  action?: { label: ReactNode; onClick: () => void };
  className?: string;
}

/** Figma « Messages système »: a quiet band, announced as an alert when it is an error. Same drawing as KANTO's, in three languages. */
export function StatusBanner({ tone = "info", children, reference, action, className }: StatusBannerProps) {
  return (
    <div className={cx(styles.banner, tone !== "info" && styles[tone], className)} role={tone === "error" ? "alert" : "status"}>
      <div className={styles.body}>
        {children}
        {reference ? (
          <span className={styles.requestId}>
            <T k="kit.reference" vars={{ id: reference }} />
          </span>
        ) : null}
      </div>
      {action !== undefined && (
        <button type="button" className={styles.action} onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}
