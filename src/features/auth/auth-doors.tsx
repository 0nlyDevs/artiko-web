"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { createContext, Suspense, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Key } from "@/i18n/en";
import { LanguageSwitcher } from "@/i18n/language-switcher";
import { useT } from "@/i18n/locale";
import { Logo } from "@/kanto/components/logo/Logo";
import { IconBack } from "@/lib/ui/icons";
import { WoodFrame } from "@/lib/ui/kanto";
import { RETURN_PARAM, withReturn } from "@/features/auth/return-to";
import styles from "./auth-doors.module.css";

type Scene = "painting" | "pottery" | "palette";

// Headlines carry their line breaks and one <em>…</em>, the word the frame sets in the accent colour.
const STORY: Record<Scene, { title: Key; text: Key; points?: Key[] }> = {
  painting: { title: "authSide.signInTitle", text: "authSide.signInText" },
  pottery: { title: "authSide.signUpTitle", text: "account.signUpLede", points: ["authSide.point1", "authSide.point2", "authSide.point3"] },
  palette: { title: "authSide.passwordTitle", text: "authSide.passwordText" },
};

/** Lets a form change the video beside it (the second sign-up step has its own). */
const SceneContext = createContext<(scene: Scene | null) => void>(() => {});
export const useAuthScene = () => useContext(SceneContext);

function sceneFor(pathname: string): Scene {
  if (pathname.startsWith("/sign-up")) return "pottery";
  if (pathname.startsWith("/reset-password")) return "palette";
  return "painting";
}

/**
 * The doors into KANTO, in the direction of the Figma frame R9: an eyebrow and a display headline on the
 * left with a framed clip of hands making art, the form on the right under two tabs, one per address
 * (`/sign-up` and `/sign-in`). No app navigation here: the wordmark, a way back and the three languages.
 */
export function AuthDoors({ children }: { children: ReactNode }) {
  const { t, rich } = useT();
  const pathname = usePathname();
  const [override, setOverride] = useState<Scene | null>(null);
  const scene = override ?? sceneFor(pathname);
  const story = STORY[scene];
  const doors = pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up");
  const up = pathname.startsWith("/sign-up");

  return (
    <SceneContext.Provider value={setOverride}>
      <div className={`app ${styles.page}`}>
        <header className={styles.bar}>
          <Link href="/" aria-label={t("nav.homeAria")} className={styles.home}>
            <Logo />
          </Link>
          <Link href="/explore" className={styles.back}>
            <IconBack size={16} strokeWidth={2} />
            <span className={styles.backText}>{t("authSide.back")}</span>
          </Link>
          <LanguageSwitcher placement="inline" />
        </header>

        <div className={styles.body}>
          <aside key={`story-${scene}`} className={styles.intro}>
            <p className={styles.eyebrow}>{t("account.eyebrow")}</p>
            <p className={`rise ${styles.headline}`}>{rich(story.title, { em: (word) => <span className={styles.accent}>{word}</span> })}</p>
            <p className={`rise ${styles.lede}`}>{t(story.text)}</p>
            {story.points && (
              <ul className={`rise ${styles.points}`}>
                {story.points.map((point) => (
                  <li key={point}>{t(point)}</li>
                ))}
              </ul>
            )}
          </aside>

          <main className={styles.form}>
            {doors && (
              // The way back travels from one door to the other; it is read from the address, in the browser.
              <Suspense fallback={<Doors up={up} next={null} />}>
                <DoorsWithReturn up={up} />
              </Suspense>
            )}
            {children}
          </main>

          <figure className={styles.picture}>
            <WoodFrame className={styles.frame}>
              <Clip key={scene} src={`/auth/${scene}.mp4`} />
            </WoodFrame>
            <figcaption>
              <a href="/auth/CREDITS.md" target="_blank" rel="noreferrer" className={styles.credits}>
                {t("authSide.credits")}
              </a>
            </figcaption>
          </figure>
        </div>

        <p className={styles.foot}>{t("footer.title")}</p>
      </div>
    </SceneContext.Provider>
  );
}

/** The two tabs of the frame, « Créer un compte » and « Se connecter »: each is a link to its own address. */
export function Doors({ up, next }: { up: boolean; next: string | null }) {
  const { t } = useT();
  return (
    <nav aria-label={t("authSide.doors")} className={styles.doors}>
      <Link href={withReturn("/sign-up", next)} aria-current={up ? "page" : undefined} className={styles.door}>
        {t("auth.signUpTitle")}
      </Link>
      <Link href={withReturn("/sign-in", next)} aria-current={up ? undefined : "page"} className={styles.door}>
        {t("auth.signInSubmit")}
      </Link>
    </nav>
  );
}

function DoorsWithReturn({ up }: { up: boolean }) {
  return <Doors up={up} next={useSearchParams().get(RETURN_PARAM)} />;
}

/** A muted looping clip with a slow zoom; it stays still for people who asked for less motion. */
function Clip({ src }: { src: string }) {
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) v.pause();
    else v.play().catch(() => {});
  }, []);
  return <video ref={video} src={src} muted loop playsInline autoPlay preload="metadata" aria-hidden="true" className={`ken ${styles.clip}`} />;
}
