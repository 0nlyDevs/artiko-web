"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import type { Key } from "@/i18n/en";
import { LanguageSwitcher } from "@/i18n/language-switcher";
import { useT } from "@/i18n/locale";
import { authClient } from "@/lib/auth-client";
import { Avatar } from "@/lib/ui/avatar";
import { IconExplore, IconHome, IconPlus, IconScan, IconSprout, IconTrophy } from "@/lib/ui/icons";

type Item = { href: string; label: Key; short?: Key; icon: (p: { size?: number; strokeWidth?: number }) => ReactNode };

const HOME: Item = { href: "/", label: "nav.home", icon: IconHome };
const EXPLORE: Item = { href: "/explore", label: "nav.explore", icon: IconExplore };
const HALL: Item = { href: "/hall-of-fame", label: "nav.hallOfFame", icon: IconTrophy };
const HERITAGE: Item = { href: "/heritage", label: "nav.heritageShort", icon: IconSprout };
const SCAN: Item = { href: "/scan", label: "nav.scan", short: "nav.scanShort", icon: IconScan };
const PUBLISH: Item = { href: "/me?tab=publish", label: "nav.publish", icon: IconPlus };

/** Whether a nav link is the current page; works and artist museums belong to Explore. */
function isCurrent(href: string, pathname: string) {
  const path = href.split("?")[0];
  if (path === "/explore") return pathname === "/explore" || pathname.startsWith("/works/") || pathname.startsWith("/artists/");
  return path !== "/me" && path !== "/" && pathname.startsWith(path);
}

/**
 * The app pages' frame: a rail on the left (labels from 1024 px, icons only from 768 px), and on
 * phones a top bar with the logo plus a tab bar at the bottom, where thumbs reach.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useT();
  return (
    <div className="app flex min-h-dvh bg-white text-ink">
      {/* The links read the address, which pages with [params] only know at request time. */}
      <Suspense fallback={<Rail pathname="" />}>
        <LitRail />
      </Suspense>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-white/90 px-4 backdrop-blur md:hidden">
          <Link href="/" aria-label={t("nav.homeAria")} className="mr-auto text-2xl font-extrabold tracking-[-0.05em]">
            artiko<span className="text-red">·</span>
          </Link>
          <Link href="/scan" aria-label={t("nav.scan")} className="inline-flex size-11 items-center justify-center rounded-full hover:bg-surface">
            <IconScan size={22} />
          </Link>
          <LanguageSwitcher placement="inline" />
        </header>

        <main className="w-full flex-1 px-4 pt-6 pb-28 sm:px-6 md:px-8 md:pt-8 md:pb-16 lg:px-10">{children}</main>

        <footer className="hidden px-4 pb-8 text-sm text-muted sm:px-6 md:block md:px-8 lg:px-10">
          <p className="font-bold text-ink">{t("footer.title")}</p>
          <p className="max-w-2xl">{t("footer.text")}</p>
        </footer>
      </div>

      <Suspense fallback={<TabBar pathname="" />}>
        <LitTabBar />
      </Suspense>
    </div>
  );
}

const LitRail = () => <Rail pathname={usePathname()} />;
const LitTabBar = () => <TabBar pathname={usePathname()} />;

/** The signed-in person's initials, or a plain disc. */
function Me({ size }: { size: number }) {
  const name = authClient.useSession().data?.user.name;
  return name ? <Avatar name={name} size={size} tone="ink" /> : <span className="inline-flex rounded-full bg-ink" style={{ width: size, height: size }} aria-hidden="true" />;
}

function Rail({ pathname }: { pathname: string }) {
  const { t } = useT();
  const meCurrent = pathname === "/me";
  return (
    <nav
      aria-label={t("nav.main")}
      className="sticky top-0 hidden h-dvh w-20 shrink-0 flex-col items-center gap-1 border-r border-line px-3 py-6 md:flex lg:w-64 lg:items-stretch lg:px-3.5"
    >
      <Link href="/" aria-label={t("nav.homeAria")} className="mb-6 px-3.5 text-3xl font-extrabold tracking-[-0.05em]">
        <span className="lg:hidden">a</span>
        <span className="hidden lg:inline">artiko</span>
        <span className="text-red">·</span>
      </Link>
      {[HOME, EXPLORE, HALL, HERITAGE, SCAN, PUBLISH].map((item) => (
        <RailLink key={item.href} item={item} current={isCurrent(item.href, pathname)} label={t(item.label)} />
      ))}
      <Link
        href="/me"
        aria-current={meCurrent ? "page" : undefined}
        aria-label={t("nav.mySpace")}
        className="group flex h-12 items-center justify-center gap-3.5 rounded-full px-3.5 transition-colors hover:bg-surface aria-[current=page]:bg-surface aria-[current=page]:font-extrabold lg:justify-start"
      >
        <Me size={26} />
        <span className="hidden lg:inline">{t("nav.mySpace")}</span>
      </Link>
      <div className="mt-auto hidden px-3.5 lg:block">
        <LanguageSwitcher placement="inline" />
      </div>
    </nav>
  );
}

function TabBar({ pathname }: { pathname: string }) {
  const { t } = useT();
  const meCurrent = pathname === "/me";
  return (
    <nav
      aria-label={t("nav.main")}
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      {[EXPLORE, HALL, PUBLISH, HERITAGE].map((item) => (
        <TabLink key={item.href} item={item} current={isCurrent(item.href, pathname)} label={t(item.short ?? item.label)} />
      ))}
      <Link
        href="/me"
        aria-current={meCurrent ? "page" : undefined}
        className="flex flex-col items-center justify-center gap-1 py-2 text-[11px] font-semibold text-muted aria-[current=page]:text-ink"
      >
        <Me size={24} />
        {t("nav.me")}
      </Link>
    </nav>
  );
}

function RailLink({ item, current, label }: { item: Item; current: boolean; label: string }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={current ? "page" : undefined}
      aria-label={label}
      className="group flex h-12 items-center justify-center gap-3.5 rounded-full px-3.5 transition-colors hover:bg-surface aria-[current=page]:bg-surface aria-[current=page]:font-extrabold lg:justify-start"
    >
      <span className="transition-transform group-hover:scale-110">
        <Icon size={24} strokeWidth={current ? 2.3 : 1.8} />
      </span>
      <span className="hidden lg:inline">{label}</span>
    </Link>
  );
}

function TabLink({ item, current, label }: { item: Item; current: boolean; label: string }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={current ? "page" : undefined}
      className="flex flex-col items-center justify-center gap-1 py-2 text-[11px] font-semibold text-muted aria-[current=page]:text-ink"
    >
      <Icon size={24} strokeWidth={current ? 2.3 : 1.8} />
      {label}
    </Link>
  );
}
