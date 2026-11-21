"use client";

import { useT } from "@/i18n/locale";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  const { t } = useT();
  return (
    <div className="flex flex-col items-start gap-4">
      <h1 className="font-heading text-6xl">{t("error.title")}</h1>
      <p className="max-w-xl text-xl">{t("error.text")}</p>
      <button type="button" onClick={reset} className="bg-ink px-5 py-3 font-bold text-paper">
        {t("error.retry")}
      </button>
    </div>
  );
}
