import type { ReactNode } from "react";
import styles from "@/kanto/components/demo-badge/DemoBadge.module.css";
import { cx } from "./cx";

export interface DemoBadgeProps {
  /** What the mark says, for example « Données de démonstration ». */
  children: ReactNode;
  theme?: "light" | "dark";
  className?: string;
}

/**
 * Marks content that is demonstration content, so a screen never passes it for a real result. Same
 * drawing as KANTO's `DemoBadge`, without its link to the simulated API: here the screen decides.
 */
export function DemoBadge({ children, theme = "light", className }: DemoBadgeProps) {
  return (
    <span className={cx(styles.badge, theme === "dark" && styles.dark, className)}>
      <span className={styles.dot} aria-hidden="true" />
      {children}
    </span>
  );
}
