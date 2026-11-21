"use client";

import Image from "next/image";
import Link from "next/link";
import type { Work } from "@/lib/api";
import { useT } from "@/i18n/locale";
import { ProofSeal } from "@/lib/works/proof-seal";

const KIND = { audio: "work.kind.audio", video: "work.kind.video", model: "work.kind.model" } as const;

/** A work as a museum wall label: the piece, then title, maker and seal underneath. */
export function WorkLabel({ work, rank }: { work: Work; rank?: number }) {
  const { t, plural } = useT();
  return (
    <article className="flex flex-col gap-3">
      <Link href={`/artists/${work.artist_id}`} className="block bg-paper">
        {work.media_kind === "image" ? (
          <Image
            src={work.media_url}
            alt={t("work.alt", { title: work.title, artist: work.artist_name })}
            width={800}
            height={600}
            className="aspect-[4/3] w-full object-cover"
          />
        ) : (
          <div className="flex aspect-[4/3] items-center justify-center text-lg font-bold">{t(KIND[work.media_kind])}</div>
        )}
      </Link>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg leading-tight font-bold">
            {rank ? `${rank}. ` : ""}
            {work.title}
          </h3>
          <p>
            <Link href={`/artists/${work.artist_id}`} className="underline underline-offset-4">
              {work.artist_name}
            </Link>
            {", "}
            {plural("votes", work.votes)}
          </p>
        </div>
        <ProofSeal work={work} />
      </div>
    </article>
  );
}
