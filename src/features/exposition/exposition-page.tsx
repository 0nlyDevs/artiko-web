import { Suspense } from "react";
import { ExpositionSheet } from "@/features/exposition/exposition-sheet";
import { loadExpositionRoom } from "@/features/exposition/load-exposition";
import { PageTitle, T } from "@/i18n/locale";
import styles from "./exposition.module.css";

/** The page of one exposition: its title and facts, its works, the way back to its artist. */
export function ExpositionPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<ExpositionSkeleton />}>
      <Room params={params} />
    </Suspense>
  );
}

async function Room({ params }: { params: Promise<{ id: string }> }) {
  const { exposition, works, complete } = await loadExpositionRoom((await params).id);
  return (
    <>
      <PageTitle k="meta.exposition" vars={{ title: exposition.title, artist: exposition.artist_name }} />
      <ExpositionSheet exposition={exposition} works={works} complete={complete} />
    </>
  );
}

function ExpositionSkeleton() {
  return (
    <div aria-busy="true" className={styles.page}>
      <span className="visually-hidden">
        <T k="exposition.loading" />
      </span>
      <div className={`${styles.intro} ${styles.waiting}`}>
        <div className="skel" style={{ width: "40%", height: 12 }} />
        <div className="skel" style={{ width: "90%", height: 120 }} />
        <div className="skel" style={{ width: "100%", height: 48 }} />
        <div className="skel" style={{ width: "100%", height: 132 }} />
      </div>
      <div className={styles.works}>
        <div className={styles.grid}>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className={`skel ${styles.placeholder}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
