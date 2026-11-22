"use client";

import type { Work } from "@/lib/api";
import { useT } from "@/i18n/locale";
import { BadgeLabel, badgeState } from "@/lib/ui/kanto";
import styles from "@/lib/works/vote/proof-seal.module.css";

/** The seal of a work, as the KANTO badge label: human-made with proof and its fingerprint, AI-assisted (declared), or no proof yet. */
export function ProofSeal({ work }: { work: Work }) {
  const { t } = useT();
  const state = badgeState(work);
  if (state === "human")
    return (
      <BadgeLabel state="human" className={styles.seal}>
        <span title={`SHA-256 ${work.sha256}`} className={styles.lines}>
          {t("proof.human")}
          <span className={styles.hash}>{work.sha256.slice(0, 12)}</span>
        </span>
      </BadgeLabel>
    );
  return (
    <BadgeLabel state={state} className={styles.seal}>
      {work.ai_declared ? t("proof.ai") : t("proof.none")}
    </BadgeLabel>
  );
}
