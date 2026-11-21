import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { loadMuseum } from "@/features/artist-museum/artist-museum-page";
import { MuseumView } from "@/features/artist-museum/museum-view";
import { PageTitle, T } from "@/i18n/locale";
import { IconBack } from "@/lib/ui/icons";

/** The 3D walk through an artist's works, reached from their profile. */
export function WalkPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <div aria-busy="true" className="skel mx-auto h-[70vh] max-w-[1400px]">
          <span className="sr-only">
            <T k="museum.opening" />
          </span>
        </div>
      }
    >
      <Walk params={params} />
    </Suspense>
  );
}

async function Walk({ params }: { params: Promise<{ id: string }> }) {
  await connection(); // the vote depends on this month
  const museum = await loadMuseum((await params).id);
  const { artist } = museum;
  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6">
      <PageTitle k="meta.museum" vars={{ name: artist.display_name }} />
      <div className="flex flex-wrap items-center gap-4">
        <Link href={`/artists/${artist.id}`} className="inline-flex items-center gap-2 text-sm font-bold hover:underline">
          <IconBack size={16} strokeWidth={2} />
          {artist.display_name}
        </Link>
        <h1 className="w-full text-[32px] leading-none font-extrabold tracking-[-0.04em]">
          <T k="museum.walk" />
        </h1>
      </div>
      {museum.slots.length ? (
        <MuseumView museum={museum} />
      ) : (
        <p className="rounded-md bg-surface px-6 py-12 text-center text-muted">
          <T k="museum.empty" />
        </p>
      )}
    </div>
  );
}
