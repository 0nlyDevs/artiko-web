"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Key } from "@/i18n/en";
import { useT } from "@/i18n/locale";
import type { Artist, Exposition, Work } from "@/lib/api";
import { monthLabel } from "@/lib/months";
import { Avatar } from "@/lib/ui/avatar";
import { IconClose, IconSeal } from "@/lib/ui/icons";
import { useVote, VotePanel } from "@/lib/works/vote";

const IMAGE = /\.(jpe?g|png|webp)$/i;

/** One work like a post: the piece on a dark ground, then its maker, story, proof and vote. Double-click the piece to vote. */
export function WorkSheet({ work, artist, exposition }: { work: Work; artist: Artist; exposition: Exposition | null }) {
  const { t, locale } = useT();
  const router = useRouter();
  const vote = useVote(work);
  const [burst, setBurst] = useState(0);

  // Back only when the visitor came from a page of this site; a shared link closes to Explore.
  const close = () => (document.referrer.startsWith(window.location.origin) ? router.back() : router.push("/explore"));
  const doubleClick = () => {
    if (vote.vote()) setBurst((n) => n + 1);
  };

  return (
    <article className="rise mx-auto flex max-w-[1180px] flex-col overflow-hidden rounded-md bg-white shadow-[0_0_0_1px_var(--line)] md:min-h-[640px] md:flex-row">
      <div
        // Images only: a double-click on a video or sound player means full screen or seeking, not a vote.
        onDoubleClick={work.media_kind === "image" ? doubleClick : undefined}
        title={work.media_kind === "image" && vote.state === "open" ? t("vote.doubleClick") : undefined}
        className="relative flex min-h-[320px] items-center justify-center bg-[#1E1614] select-none md:flex-[2]"
      >
        {work.media_kind === "image" && (
          <Image
            src={work.media_url}
            alt={t("work.alt", { title: work.title, artist: work.artist_name })}
            fill
            priority
            sizes="(min-width: 768px) 66vw, 100vw"
            className="object-contain"
          />
        )}
        {work.media_kind === "audio" && <audio controls src={work.media_url} className="w-4/5" />}
        {work.media_kind === "video" && <video controls src={work.media_url} className="max-h-[80vh] w-full" />}
        {work.media_kind === "model" && <p className="p-6 text-lg font-bold text-white">{t("work.kind.model")}</p>}
        {burst > 0 && (
          <svg key={burst} viewBox="0 0 24 24" className="burst" fill="currentColor" aria-hidden="true">
            <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
          </svg>
        )}
        <button
          type="button"
          onClick={close}
          aria-label={t("work.close")}
          className="absolute top-3 right-3 inline-flex size-11 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition-colors hover:bg-white/25"
        >
          <IconClose size={22} strokeWidth={2} />
        </button>
      </div>

      <div className="flex flex-col md:w-[400px] md:flex-none">
        <header className="flex items-center gap-3 border-b border-line px-5 py-4">
          <Avatar name={artist.display_name} size={40} tone="ink" />
          <span className="flex min-w-0 flex-1 flex-col">
            <Link href={`/artists/${artist.id}`} className="truncate font-bold hover:underline">
              {artist.display_name}
            </Link>
            {artist.region && <span className="truncate text-sm text-muted">{artist.region}</span>}
          </span>
          <Link href={`/artists/${artist.id}`} className="shrink-0 text-sm font-semibold hover:underline">
            {t("work.museum")}
          </Link>
        </header>

        <div className="flex flex-1 flex-col gap-5 px-5 py-5">
          <div>
            <h1 className="text-[30px] leading-[1.05] font-extrabold tracking-[-0.04em]">{work.title}</h1>
            <p className="mt-1.5 text-sm text-muted first-letter:uppercase">
              {[t(`category.${work.category}` as Key), monthLabel(work.month, locale), exposition?.title].filter(Boolean).join(" · ")}
            </p>
          </div>
          {work.story && <p className="font-serif text-[22px] leading-snug italic">{work.story}</p>}

          <section aria-label={t("museum.proof")} className="flex flex-col gap-3 rounded-md bg-surface p-4">
            <p className="flex items-center gap-2 font-bold">
              <IconSeal size={20} strokeWidth={2.2} />
              {work.human_proven ? t("proof.human") : work.ai_declared ? t("proof.ai") : t("proof.none")}
            </p>
            {work.proof_urls.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {work.proof_urls.map((url, i) => (
                  <a key={url} href={url} target="_blank" rel="noreferrer" className="relative block size-16 overflow-hidden rounded bg-white">
                    {IMAGE.test(url) ? (
                      <Image src={url} alt={t("museum.stepAlt", { n: i + 1 })} fill sizes="64px" className="object-cover" />
                    ) : (
                      <span className="flex size-full items-center justify-center text-xs font-semibold">{t("museum.step", { n: i + 1 })}</span>
                    )}
                  </a>
                ))}
              </div>
            )}
            <p className="text-[13px] leading-snug text-muted">
              {t("work.footprint", { hash: work.sha256.slice(0, 12) })} {t("footer.text")}
            </p>
          </section>
        </div>

        <footer className="border-t border-line px-5 pt-4 pb-5">
          <VotePanel work={work} vote={vote} />
        </footer>
      </div>
    </article>
  );
}
