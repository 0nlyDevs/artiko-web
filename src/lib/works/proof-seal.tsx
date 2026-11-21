"use client";

import type { Work } from "@/lib/api";
import { useT } from "@/i18n/locale";

/** The square seal: human-made with proof, AI-assisted (declared), or no proof yet. */
export function ProofSeal({ work }: { work: Work }) {
  const { t } = useT();
  if (work.human_proven)
    return (
      <span
        className="inline-flex flex-col border-2 border-ink bg-red px-2 py-1 text-xs leading-tight font-bold text-ink"
        title={`SHA-256 ${work.sha256}`}
      >
        {t("proof.human")}
        <span className="font-normal">{work.sha256.slice(0, 12)}</span>
      </span>
    );
  return (
    <span className="inline-block border border-ink/40 px-2 py-1 text-xs">
      {work.ai_declared ? t("proof.ai") : t("proof.none")}
    </span>
  );
}
