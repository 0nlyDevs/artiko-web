import { Suspense } from "react";
import { HeritageHead, HeritageIndex, IndexSkeleton } from "@/features/heritage/heritage-view";
import { listPractices, unwrap } from "@/lib/api";
import styles from "./heritage.module.css";

export function HeritagePage() {
  return (
    <div className={styles.page}>
      <HeritageHead />
      <Suspense fallback={<IndexSkeleton />}>
        <Practices />
      </Suspense>
    </div>
  );
}

async function Practices() {
  return <HeritageIndex practices={unwrap(await listPractices())} />;
}
