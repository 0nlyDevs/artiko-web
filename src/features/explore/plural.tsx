"use client";

import { useT } from "@/i18n/locale";
import type { PluralBase } from "@/i18n/locales";

/** A counted phrase for server components, which cannot call hooks: `<Plural base="explore.count" n={3} />`. */
export function Plural({ base, n }: { base: PluralBase; n: number }) {
  return useT().plural(base, n);
}
