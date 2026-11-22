import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ApiError, getArtist, getExposition, getWork, listCategories, listWorks, unwrap, type Work } from "@/lib/api";
import { PAGE_LIMIT } from "@/lib/paging";
import { roomPlace } from "@/features/work/work-facts";
import { WorkSheet } from "@/features/work/work-sheet";
import { T } from "@/i18n/locale";
import styles from "./work-sheet.module.css";

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

/** What decorates the notice without being the work: a failed read leaves the notice whole, without that part. */
const optional = <D,>(read: Promise<{ data?: D }>): Promise<D | null> => read.then((r) => r.data ?? null).catch(() => null);

async function Sheet({ params }: { params: Promise<{ id: string }> }) {
  await connection(); // the vote depends on this month
  const work = await loadWork((await params).id);
  // Public reads, without a token: what depends on the visitor (their votes, private proofs) is read in the browser.
  const [artist, exposition, room, categories] = await Promise.all([
    getArtist({ path: { artist_id: work.artist_id } }).then(unwrap),
    work.exposition_id ? getExposition({ path: { exposition_id: work.exposition_id } }).then((r) => r.data ?? null) : null,
    // The room of the work is its category: its rank and the next work come from one page of the list.
    optional(listWorks({ query: { category: work.category, limit: PAGE_LIMIT } })),
    optional(listCategories()),
  ]);
  return (
    <WorkSheet
      work={work}
      artist={artist}
      exposition={exposition}
      place={room ? roomPlace(room, work.id, PAGE_LIMIT) : null}
      rooms={categories ?? []}
    />
  );
}

function SheetSkeleton() {
  return (
    <div aria-busy="true" className={styles.notice} data-shell-theme="dark" data-shell-bleed>
      <span className="visually-hidden">
        <T k="work.loading" />
      </span>
      <div className={styles.room} />
      <div className={`${styles.panel} ${styles.waiting}`}>
        <div className="skel" style={{ width: "30%", height: 12 }} />
        <div className="skel" style={{ width: "70%", height: 88 }} />
        <div className="skel" style={{ width: "50%", height: 18 }} />
        <div className="skel" style={{ width: "100%", height: 200 }} />
        <div className="skel" style={{ width: "100%", height: 113 }} />
        <div className="skel" style={{ width: 190, height: 48, borderRadius: 999 }} />
      </div>
    </div>
  );
}
