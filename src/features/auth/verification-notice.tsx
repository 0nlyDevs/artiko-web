"use client";

import type { Key } from "@/i18n/en";
import { useT } from "@/i18n/locale";
import { Notice } from "@/features/auth/fields";

/** What a verification link's landing page says: the address is confirmed, or the link no longer works. */
export function VerificationNotice({ notice }: { notice: Key }) {
  const { t } = useT();
  return <Notice tone={notice === "auth.verified" ? "info" : "error"}>{t(notice)}</Notice>;
}
