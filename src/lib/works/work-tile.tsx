"use client";

import Image from "next/image";
import Link from "next/link";
import { useT } from "@/i18n/locale";
import type { Work } from "@/lib/api";
import { Avatar } from "@/lib/ui/avatar";
import { IconHeart, IconSeal } from "@/lib/ui/icons";
import { CategoryLabel } from "@/lib/works/category-label";

const KIND = { audio: "work.kind.audio", video: "work.kind.video", model: "work.kind.model" } as const;

/** The picture of a work, or a labelled block for sound, video and 3D, filling its parent. */
export function WorkMedia({ work, sizes, priority }: { work: Work; sizes: string; priority?: boolean }) {
  const { t } = useT();
  if (work.media_kind === "image")
    return (
      <Image
        src={work.media_url}
        alt={t("work.alt", { title: work.title, artist: work.artist_name })}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover"
      />
    );
  return (
    <span className="absolute inset-0 flex items-center justify-center bg-ink px-4 text-center text-lg font-bold text-white">
      {t(KIND[work.media_kind])}
    </span>
  );
}

/** A work in a feed: portrait picture with its seal and votes, then title and maker. `index` staggers the entrance. */
export function WorkTile({ work, index = 0, sizes = "(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw" }: { work: Work; index?: number; sizes?: string }) {
  const { t, plural } = useT();
  return (
    <Link
      href={`/works/${work.id}`}
      className="tile rise flex min-w-0 flex-col gap-2.5"
      style={{ animationDelay: `${Math.min(index, 12) * 45}ms` }}
    >
      <span className="tile-media relative block aspect-[3/4] overflow-hidden rounded-md bg-surface">
        <WorkMedia work={work} sizes={sizes} />
        {work.human_proven && (
          <span className="absolute top-2.5 left-2.5 inline-flex h-[26px] items-center gap-1.5 rounded-full bg-white/90 pr-2.5 pl-1.5 text-xs font-semibold text-ink">
            <IconSeal size={16} strokeWidth={2.2} />
            {t("proof.short")}
          </span>
        )}
        <span className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-gradient-to-t from-ink/60 to-transparent px-3 pt-7 pb-2.5 text-sm font-bold text-white">
          <IconHeart size={18} strokeWidth={2} />
          <span className="sr-only">{plural("votes", work.votes)}</span>
          <span aria-hidden="true">{work.votes}</span>
        </span>
      </span>
      <span className="flex min-w-0 items-center gap-2.5">
        <Avatar name={work.artist_name} />
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-[15px] leading-tight font-semibold">{work.title}</span>
          <span className="truncate text-[13px] leading-snug text-muted">
            {work.artist_name} · <CategoryLabel category={{ id: work.category }} />
          </span>
        </span>
      </span>
    </Link>
  );
}
