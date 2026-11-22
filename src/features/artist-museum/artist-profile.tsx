"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { Key } from "@/i18n/en";
import { useT } from "@/i18n/locale";
import type { Artist, CategoryId, Exposition, Practice, Work } from "@/lib/api";
import { Avatar } from "@/lib/ui/avatar";
import { HeartFilled, IconMuseum, IconPin, IconSeal, IconShare } from "@/lib/ui/icons";
import { SlidingTabs } from "@/lib/ui/sliding-tabs";
import { WorkMedia } from "@/lib/works/work-tile";

export type HallPlace = { rank: number; work: Work; votes: number };

const STATUS_DOT = { red: "bg-red", orange: "bg-[#E09A2C]", green: "bg-[#2E8B57]" } as const;
const STATUS_TEXT = { red: "text-[#8E3524]", orange: "text-[#7A4206]", green: "text-[#1F6B40]" } as const;

/**
 * An artist's page as a profile: who they are on the right, their works in the middle (by exposition
 * or by art form), and what goes with them on the left. On phones the artist comes first.
 */
export function ArtistProfile({
  artist,
  works,
  expositions,
  places,
  others,
  practices,
}: {
  artist: Artist;
  works: Work[];
  expositions: Exposition[];
  places: HallPlace[];
  others: Artist[];
  practices: Practice[];
}) {
  const { t, plural } = useT();
  const [view, setView] = useState<"expo" | "genre">("expo");
  const [expo, setExpo] = useState<string>("all");
  const categories = [...new Set(works.map((w) => w.category))];
  const [genre, setGenre] = useState<CategoryId | undefined>(categories[0]);
  const [copied, setCopied] = useState(false);

  const current = expositions.find((e) => e.id === expo);
  const shown =
    view === "genre"
      ? works.filter((w) => w.category === genre).sort((a, b) => b.votes - a.votes)
      : current
        ? works.filter((w) => w.exposition_id === current.id)
        : works;
  const totalVotes = works.reduce((n, w) => n + w.votes, 0);
  const proven = works.filter((w) => w.human_proven).length;

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: artist.display_name, url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
      }
    } catch {
      // Closing the share sheet is not an error.
    }
  };

  return (
    <div className="mx-auto grid max-w-[1400px] gap-10 lg:grid-cols-[220px_minmax(0,1fr)_280px] xl:grid-cols-[250px_minmax(0,1fr)_300px]">
      {/* The artist: first on phones, right column on wide screens. */}
      <aside aria-label={t("artist.about")} className="rise flex flex-col gap-5 lg:sticky lg:top-8 lg:order-3 lg:self-start">
        <div className="flex items-center gap-4 lg:flex-col lg:items-start">
          <Avatar name={artist.display_name} size={88} tone="ink" />
          <div>
            <h1 className="text-[30px] leading-[1.05] font-extrabold tracking-[-0.04em]">{artist.display_name}</h1>
            <p className="mt-2 flex items-center gap-1.5 text-muted">
              <IconPin size={16} strokeWidth={2} />
              {[artist.region, ...categories.map((c) => t(`category.${c}` as Key))].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>
        <dl className="grid grid-cols-3 gap-2">
          <Stat label={t("artist.works")} value={works.length} />
          <Stat label={t("artist.votes")} value={totalVotes} />
          <Stat label={t("artist.expositions")} value={expositions.length} />
        </dl>
        {artist.bio && <p className="font-serif text-[22px] leading-snug italic">{artist.bio}</p>}
        {works.length > 0 && (
          <p className="flex items-center gap-2 text-sm">
            <IconSeal size={18} strokeWidth={2} />
            {t("artist.proven", { proven, total: works.length })}
          </p>
        )}
        <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
          {works.length > 0 && (
            <Link href={`/artists/${artist.id}/museum`} className="btn btn-ink flex-1">
              <IconMuseum size={20} />
              {t("museum.walk")}
            </Link>
          )}
          <button type="button" onClick={share} className="btn btn-soft flex-1">
            <IconShare size={20} />
            {copied ? t("artist.copied") : t("artist.share")}
          </button>
        </div>
      </aside>

      <section aria-label={t("artist.worksTitle")} className="min-w-0 lg:order-2">
        {expositions.length > 0 && (
          <div role="group" aria-label={t("artist.expositions")} className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
            <Highlight label={t("explore.all")} cover={works.find((w) => w.media_kind === "image")?.media_url ?? null} on={view === "expo" && expo === "all"} pick={() => { setView("expo"); setExpo("all"); }} />
            {expositions.map((e) => (
              <Highlight key={e.id} label={e.title} cover={e.cover_url} on={view === "expo" && expo === e.id} pick={() => { setView("expo"); setExpo(e.id); }} />
            ))}
          </div>
        )}

        <div className="mt-5">
          <SlidingTabs
            id="artist"
            label={t("artist.sort")}
            value={view}
            onChange={setView}
            tabs={[
              { key: "expo", label: t("artist.byExposition") },
              { key: "genre", label: t("artist.byForm") },
            ]}
          />
        </div>

        <div id="artist-panel" role="tabpanel" aria-labelledby={`artist-tab-${view}`}>
          {view === "genre" && categories.length > 1 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {categories.map((c) => (
                <button key={c} type="button" aria-pressed={c === genre} onClick={() => setGenre(c)} className="chip bg-surface aria-pressed:bg-ink">
                  {t(`category.${c}` as Key)} · {works.filter((w) => w.category === c).length}
                </button>
              ))}
            </div>
          )}
          <div className="mt-6 mb-5 flex flex-col gap-1.5">
            <h2 className="text-[26px] font-extrabold tracking-[-0.03em]">
              {view === "genre" ? (genre ? t(`category.${genre}` as Key) : t("artist.worksTitle")) : current ? current.title : t("artist.allWorks")}
            </h2>
            {view === "expo" && current?.description && <p className="max-w-[60ch] font-serif text-[21px] leading-snug italic">{current.description}</p>}
            <p className="text-sm text-muted">{plural("works", shown.length)}</p>
          </div>
          {shown.length ? (
            <div key={`${view}-${expo}-${genre}`} className="grid grid-cols-3 gap-1">
              {shown.map((w, i) => (
                <Link
                  key={w.id}
                  href={`/works/${w.id}`}
                  className="tile rise group relative block aspect-[4/5] overflow-hidden bg-surface"
                  style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}
                >
                  <span className="tile-media absolute inset-0">
                    <WorkMedia work={w} sizes="(min-width: 1024px) 18vw, 33vw" />
                  </span>
                  <span className="absolute inset-0 flex items-center justify-center gap-1.5 bg-ink/35 font-bold text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                    <HeartFilled size={20} />
                    {w.votes}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="rounded-md bg-surface px-6 py-12 text-center text-muted">{t("museum.empty")}</p>
          )}
        </div>
      </section>

      <aside aria-label={t("artist.related")} className="flex flex-col gap-9 lg:order-1">
        {places.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-bold text-muted">{t("artist.inHall")}</h2>
            <ul className="flex flex-col gap-3">
              {places.map((p) => (
                <li key={p.work.id}>
                  <Link href={`/works/${p.work.id}`} className="flex items-center gap-3">
                    <span className="relative block h-20 w-16 shrink-0 overflow-hidden rounded-md bg-surface">
                      <WorkMedia work={p.work} sizes="64px" />
                    </span>
                    <span className="flex flex-col gap-0.5">
                      <span className="text-[28px] leading-none font-extrabold tracking-[-0.04em]">#{p.rank}</span>
                      <span className="text-sm font-semibold">{t(`category.${p.work.category}` as Key)}</span>
                      <span className="text-[13px] text-muted">
                        {p.work.title}, {plural("votes", p.votes)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        {others.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-bold text-muted">{t("artist.others")}</h2>
            <ul className="flex flex-col gap-3.5">
              {others.map((a) => (
                <li key={a.id}>
                  <Link href={`/artists/${a.id}`} className="flex items-center gap-3">
                    <Avatar name={a.display_name} size={44} />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate font-semibold">{a.display_name}</span>
                      {a.region && <span className="truncate text-[13px] text-muted">{a.region}</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        {practices.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-bold text-muted">{t("artist.heritage")}</h2>
            <ul className="flex flex-col gap-2">
              {practices.map((p) => (
                <li key={p.id}>
                  <Link href="/heritage" className="flex flex-col gap-1 rounded-md bg-surface px-3.5 py-3 transition-colors hover:bg-[var(--surface-hover)]">
                    <span className="font-semibold">{p.name}</span>
                    <span className={`flex items-center gap-1.5 text-[13px] font-semibold ${STATUS_TEXT[p.status]}`}>
                      <span aria-hidden="true" className={`size-2 rounded-full ${STATUS_DOT[p.status]}`} />
                      {t(`heritage.${p.status}`)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </aside>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-[13px] text-muted">{label}</dt>
      <dd className="text-[22px] font-extrabold tabular-nums">{value}</dd>
    </div>
  );
}

/** An exposition as a story ring: the terracotta ring marks the one shown. */
function Highlight({ label, cover, on, pick }: { label: string; cover: string | null; on: boolean; pick: () => void }) {
  return (
    <button type="button" aria-pressed={on} onClick={pick} className="group flex w-[88px] shrink-0 flex-col items-center gap-2 text-[13px] font-medium">
      <span key={String(on)} className={`block size-[72px] rounded-full p-[3px] transition-transform group-hover:scale-105 ${on ? "pop bg-red" : "bg-[#E3D8CE]"}`}>
        <span className="relative block size-full overflow-hidden rounded-full border-2 border-white bg-surface">
          {cover && <Image src={cover} alt="" fill sizes="72px" className="object-cover" />}
        </span>
      </span>
      <span className="line-clamp-2 text-center leading-tight">{label}</span>
    </button>
  );
}
