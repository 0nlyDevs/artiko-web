import Image from "next/image";
import Link from "next/link";
import type { Work } from "@/lib/api";
import { ProofSeal } from "@/lib/works/proof-seal";

const KIND = { audio: "Sound", video: "Video", model: "3D object" } as const;

/** A work as a museum wall label: the piece, then title, maker and seal underneath. */
export function WorkLabel({ work, rank }: { work: Work; rank?: number }) {
  return (
    <article className="flex flex-col gap-3">
      <Link href={`/artists/${work.artist_id}`} className="block bg-paper">
        {work.media_kind === "image" ? (
          <Image
            src={work.media_url}
            alt={`${work.title} by ${work.artist_name}`}
            width={800}
            height={600}
            className="aspect-[4/3] w-full object-cover"
          />
        ) : (
          <div className="flex aspect-[4/3] items-center justify-center text-lg font-bold">{KIND[work.media_kind]}</div>
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
            {work.votes} {work.votes === 1 ? "vote" : "votes"}
          </p>
        </div>
        <ProofSeal work={work} />
      </div>
    </article>
  );
}
