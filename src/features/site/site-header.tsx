"use client";

import Link from "next/link";
import { ArtikoLogo } from "@/components/brand/ArtikoLogo";
import { useT } from "@/i18n/locale";

const NAV = [
  { href: "/explore", label: "nav.explore" },
  { href: "/hall-of-fame", label: "nav.hallOfFame" },
  { href: "/heritage", label: "nav.heritage" },
  { href: "/scan", label: "nav.scan" },
] as const;

export function SiteHeader() {
  const { t } = useT();
  return (
    <header className="border-b border-ink/15">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-4 sm:px-8">
        <Link href="/" className="mr-auto block" aria-label={t("nav.homeAria")}>
          <ArtikoLogo height={32} />
        </Link>
        {NAV.map((item) => (
          <Link key={item.href} href={item.href} className="underline-offset-4 hover:underline">
            {t(item.label)}
          </Link>
        ))}
        <Link href="/me" className="bg-ink px-4 py-2 text-paper">
          {t("nav.mySpace")}
        </Link>
      </nav>
    </header>
  );
}
