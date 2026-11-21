import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ApiError, getArtist, getExposition, getWork, unwrap, type Work } from "@/lib/api";
import { WorkSheet } from "@/features/work/work-sheet";
import { T } from "@/i18n/locale";

export async function loadWork(id: string): Promise<Work> {
  try {
    return unwrap(await getWork({ path: { work_id: id } }));
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 422)) notFound();
    throw e;
  }
}

export function WorkPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<SheetSkeleton />}>
      <Sheet params={params} />
    </Suspense>
  );
}

async function Sheet({ params }: { params: Promise<{ id: string }> }) {
  await connection(); // the vote depends on this month
  const work = await loadWork((await params).id);
  const [artist, exposition] = await Promise.all([
    getArtist({ path: { artist_id: work.artist_id } }).then(unwrap),
    work.exposition_id ? getExposition({ path: { exposition_id: work.exposition_id } }).then((r) => r.data ?? null) : null,
  ]);
  return <WorkSheet work={work} artist={artist} exposition={exposition} />;
}

function SheetSkeleton() {
  return (
    <div aria-busy="true" className="mx-auto flex max-w-[1180px] flex-col overflow-hidden rounded-md md:flex-row">
      <span className="sr-only">
        <T k="work.loading" />
      </span>
      <div className="skel aspect-[4/5] md:aspect-auto md:min-h-[640px] md:flex-[2]" />
      <div className="flex flex-col gap-4 p-6 md:flex-1">
        <div className="skel h-10 w-2/3" />
        <div className="skel h-4 w-1/2" />
        <div className="skel h-24 w-full" />
        <div className="skel mt-auto h-12 w-full rounded-full" />
      </div>
    </div>
  );
}
