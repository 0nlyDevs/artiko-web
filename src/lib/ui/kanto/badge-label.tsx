"use client";

import type { ReactNode } from "react";
import type { Key } from "@/i18n/en";
import { useT } from "@/i18n/locale";
import type { BadgeState } from "./badge-state";
import { cx } from "./cx";
import styles from "./badge-label.module.css";

const LABEL: Record<BadgeState, Key> = { human: "badge.human", ai: "badge.ai", none: "proof.none" };

export interface BadgeLabelProps {
  /** `human`: proven human-made; `ai`: AI assistance declared by the artist; `none`: no proof yet. See `badgeState(work)`. */
  state: BadgeState;
  /** Replaces the label of the state, for a longer wording such as the one of the notice. */
  children?: ReactNode;
  className?: string;
}

/** Figma « Étiquette de badge »: « Preuve humaine », « Assistée par IA » or « Pas encore de preuve de création ». */
export function BadgeLabel({ state, children, className }: BadgeLabelProps) {
  const { t } = useT();
  return (
    <span className={cx(styles.badge, styles[state], className)} data-badge={state}>
      {children ?? t(LABEL[state])}
    </span>
  );
}
