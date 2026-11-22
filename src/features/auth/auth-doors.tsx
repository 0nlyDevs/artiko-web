"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Key } from "@/i18n/en";
import { LanguageSwitcher } from "@/i18n/language-switcher";
import { useT } from "@/i18n/locale";
import { IconBack, IconCheck } from "@/lib/ui/icons";

type Scene = "painting" | "pottery" | "palette";

const STORY: Record<Scene, { title: Key; text?: Key; points?: Key[] }> = {
  painting: { title: "authSide.signInTitle", text: "authSide.signInText" },
  pottery: { title: "authSide.signUpTitle", points: ["authSide.point1", "authSide.point2", "authSide.point3"] },
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
 * The doors into Artiko: a full-height clip of hands making art, the form on the other side under a
 * switch whose pill slides between signing in and creating an account. Phones get the clip as a band.
 */
export function AuthDoors({ children }: { children: ReactNode }) {
  const { t } = useT();
  const pathname = usePathname();
  const [override, setOverride] = useState<Scene | null>(null);
  const scene = override ?? sceneFor(pathname);
  const story = STORY[scene];
  const doors = pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up");
  const up = pathname.startsWith("/sign-up");

  return (
    <SceneContext.Provider value={setOverride}>
      <div className="app flex min-h-dvh flex-col bg-white text-ink lg:flex-row">
        <aside className="relative m-3 flex min-h-[220px] flex-col justify-between overflow-hidden rounded-md bg-ink p-6 text-white sm:min-h-[280px] lg:sticky lg:top-3 lg:h-[calc(100dvh-24px)] lg:flex-[1.05] lg:p-7">
          <Clip key={scene} src={`/auth/${scene}.mp4`} />
          <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-ink/55 via-ink/10 to-ink/90" />
          <Link href="/" className="relative self-start text-3xl font-extrabold tracking-[-0.05em]">
            artiko<span className="text-[#E8846C]">·</span>
          </Link>
          <div key={`story-${scene}`} className="relative flex flex-col gap-4 lg:gap-5">
            <p className="rise max-w-[13ch] text-[34px] leading-[0.95] font-extrabold tracking-[-0.05em] sm:text-[44px] lg:text-[clamp(48px,5vw,76px)]">
              {t(story.title)}
            </p>
            {story.text && (
              <p className="rise hidden max-w-[44ch] text-lg leading-relaxed text-[#EFE6DD] sm:block" style={{ animationDelay: "0.15s" }}>
                {t(story.text)}
              </p>
            )}
            {story.points && (
              <ul className="rise hidden flex-col gap-2.5 text-[17px] text-[#EFE6DD] sm:flex" style={{ animationDelay: "0.15s" }}>
                {story.points.map((p) => (
                  <li key={p} className="flex items-center gap-2.5">
                    <IconCheck size={20} strokeWidth={2.2} />
                    {t(p)}
                  </li>
                ))}
              </ul>
            )}
            <a href="/auth/CREDITS.md" target="_blank" rel="noreferrer" className="text-[13px] text-[#C9BBB2] hover:text-white hover:underline">
              {t("authSide.credits")}
            </a>
          </div>
        </aside>

        <section className="flex flex-1 flex-col px-4 pt-4 pb-8 sm:px-8 lg:px-[clamp(32px,5vw,80px)] lg:pt-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link href="/explore" className="inline-flex min-h-10 items-center gap-2 text-sm font-bold hover:underline">
              <IconBack size={16} strokeWidth={2} />
              {t("authSide.back")}
            </Link>
            <LanguageSwitcher placement="inline" />
          </div>
          <div className="my-auto flex w-full max-w-[440px] flex-col gap-7 py-10">
            {doors && (
              <nav aria-label={t("authSide.doors")} className="seg">
                <span aria-hidden="true" className="seg-pill" data-at={up ? 1 : 0} />
                <Link href="/sign-in" aria-current={up ? undefined : "page"}>
                  {t("auth.signInSubmit")}
                </Link>
                <Link href="/sign-up" aria-current={up ? "page" : undefined}>
                  {t("auth.signUpTitle")}
                </Link>
              </nav>
            )}
            {children}
          </div>
          <p className="text-[13px] text-muted">{t("footer.title")}</p>
        </section>
      </div>
    </SceneContext.Provider>
  );
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
  return (
    <video
      ref={video}
      src={src}
      muted
      loop
      playsInline
      autoPlay
      preload="metadata"
      aria-hidden="true"
      className="ken absolute inset-0 size-full object-cover opacity-85"
    />
  );
}
