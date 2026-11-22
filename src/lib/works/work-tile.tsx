"use client";

import Image from "next/image";
import Link from "next/link";
import { useT } from "@/i18n/locale";
import type { Work } from "@/lib/api";
import { BadgeLabel, badgeState } from "@/lib/ui/kanto";
import { CategoryLabel } from "@/lib/works/category-label";
import styles from "./work-tile.module.css";

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
    <span className={styles.kind}>
      <span>{t(KIND[work.media_kind])}</span>
    </span>
  );
}

/**
 * A work in a feed: its picture hung on the wall, then title, maker and art form, its badge and its votes.
 * The whole tile is one link to the notice of the work. `index` staggers the entrance.
 */
export function WorkTile({ work, index = 0, sizes = "(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw" }: { work: Work; index?: number; sizes?: string }) {
  const { plural } = useT();
  return (
    <Link href={`/works/${work.id}`} className={`tile rise ${styles.tile}`} style={{ animationDelay: `${Math.min(index, 12) * 45}ms` }}>
      <span className={`tile-media ${styles.media}`}>
        <WorkMedia work={work} sizes={sizes} />
      </span>
      <span className={styles.title}>{work.title}</span>
      <span className={styles.meta}>
        {work.artist_name} · <CategoryLabel category={{ id: work.category }} />
      </span>
      <span className={styles.foot}>
        <BadgeLabel state={badgeState(work)} />
        <span className={styles.votes}>{plural("votes", work.votes)}</span>
      </span>
    </Link>
  );
}
