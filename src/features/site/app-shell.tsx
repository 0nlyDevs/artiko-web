"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import type { Key } from "@/i18n/en";
import { LanguageSwitcher } from "@/i18n/language-switcher";
import { useT } from "@/i18n/locale";
import { Logo } from "@/kanto/components/logo/Logo";
import { authClient } from "@/lib/auth-client";
import { Avatar } from "@/lib/ui/avatar";
import { IconExplore, IconPlus, IconScan, IconSprout, IconTrophy } from "@/lib/ui/icons";
import styles from "./app-shell.module.css";

type Icon = (p: { size?: number; strokeWidth?: number }) => ReactNode;
type Item = { href: string; label: Key; short?: Key; icon: Icon };

// The entries of the frames R9 and R11, at the team's addresses. « Le musée » is the KANTO museum,
// « Artistes » the artists and their works on /explore; the wordmark is the way home.
const MUSEUM = { href: "/musee", label: "nav.museum" } as const;
const ARTISTS: Item = { href: "/explore", label: "nav.artists", icon: IconExplore };
const HALL: Item = { href: "/hall-of-fame", label: "nav.hallOfFame", icon: IconTrophy };
const HERITAGE: Item = { href: "/heritage", label: "nav.livingHeritage", short: "nav.heritageShort", icon: IconSprout };
const SCAN: Item = { href: "/scan", label: "nav.scanner", icon: IconScan };
const PUBLISH: Item = { href: "/me?tab=publish", label: "nav.publish", icon: IconPlus };

/** The links of the bar, in the order of the frames; the team's « Publish » entry closes the row. */
export const BAR_LINKS: readonly { href: string; label: Key }[] = [MUSEUM, ARTISTS, HALL, HERITAGE, SCAN, PUBLISH];
/** The tabs of the phones, as the team built them; « Me » is the fifth. */
export const TAB_LINKS: readonly Item[] = [ARTISTS, HALL, PUBLISH, HERITAGE];

/** Whether a nav link is the current page; works and artist museums belong to the artists' entry. */
export function isCurrent(href: string, pathname: string) {
  const path = href.split("?")[0];
  if (path === "/explore") return pathname === "/explore" || pathname.startsWith("/works/") || pathname.startsWith("/artists/");
  return path !== "/me" && path !== "/" && pathname.startsWith(path);
}

/**
 * The app pages' frame: from 768 px the bar of the KANTO frames (wordmark, text links, account,
 * languages; on two rows until 1024 px), and on phones a top bar with the wordmark plus a tab bar at
 * the bottom, where thumbs reach.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useT();
  return (
    <div className={`app ${styles.shell}`}>
      <header className={styles.bar}>
        <Link href="/" aria-label={t("nav.homeAria")} className={styles.home}>
          <Logo />
        </Link>
        <Link href="/scan" aria-label={t("nav.scan")} className={styles.scan}>
          <IconScan size={22} />
        </Link>
        {/* The links read the address, which pages with [params] only know at request time. */}
        <Suspense fallback={<BarNav pathname="" />}>
          <LitBarNav />
        </Suspense>
        <LanguageSwitcher placement="inline" />
      </header>

      <main className={styles.main}>{children}</main>

      <footer className={styles.footer}>
        <p className={styles.footerTitle}>{t("footer.title")}</p>
        <p className={styles.footerText}>{t("footer.text")}</p>
      </footer>

      <Suspense fallback={<TabBar pathname="" />}>
        <LitTabBar />
      </Suspense>
    </div>
  );
}

const LitBarNav = () => <BarNav pathname={usePathname()} />;
const LitTabBar = () => <TabBar pathname={usePathname()} />;

/** The signed-in person's initials, or a plain disc. */
function Me({ size }: { size: number }) {
  const name = authClient.useSession().data?.user.name;
  return name ? <Avatar name={name} size={size} tone="ink" /> : <span className={styles.disc} style={{ width: size, height: size }} aria-hidden="true" />;
}

export function BarNav({ pathname }: { pathname: string }) {
  const { t } = useT();
  return (
    <nav aria-label={t("nav.main")} className={styles.nav}>
      {BAR_LINKS.map((item) => (
        <Link key={item.href} href={item.href} aria-current={isCurrent(item.href, pathname) ? "page" : undefined} className={styles.link}>
          {t(item.label)}
          <span className={styles.underline} aria-hidden="true" />
        </Link>
      ))}
      <Link href="/me" aria-current={pathname === "/me" ? "page" : undefined} aria-label={t("nav.mySpace")} className={styles.account}>
        <Me size={28} />
        <span className={styles.accountLabel}>{t("nav.mySpace")}</span>
      </Link>
    </nav>
  );
}

export function TabBar({ pathname }: { pathname: string }) {
  const { t } = useT();
  return (
    <nav aria-label={t("nav.main")} className={styles.tabs}>
      {TAB_LINKS.map((item) => {
        const current = isCurrent(item.href, pathname);
        return (
          <Link key={item.href} href={item.href} aria-current={current ? "page" : undefined} className={styles.tab}>
            <item.icon size={22} strokeWidth={current ? 2 : 1.6} />
            <span className={styles.tabLabel}>{t(item.short ?? item.label)}</span>
          </Link>
        );
      })}
      <Link href="/me" aria-current={pathname === "/me" ? "page" : undefined} className={styles.tab}>
        <Me size={22} />
        <span className={styles.tabLabel}>{t("nav.me")}</span>
      </Link>
    </nav>
  );
}
