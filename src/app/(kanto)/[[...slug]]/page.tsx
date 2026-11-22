import { Suspense } from "react";
import { KantoShell } from "@/kanto/KantoShell";
import { readMuseumPlan } from "@/kanto/lib/museum-data/read-museum-plan";

// One optional catch-all route serves every KANTO address (/, /musee/…, /oeuvres, /contribuer/…,
// /numerisation/…, /admin…). The KANTO router reads the address in the browser and moves with the
// native History API, which Next integrates, so the WebGL room never remounts between works.
// Routes declared elsewhere in src/app (/explore, /scan, /api/auth/…) keep precedence.
export default function KantoPage() {
  // The plan of the museum comes from the real API, read here because the API refuses calls from a
  // browser on another origin. The promise is not awaited: the shell is sent at once and the plan
  // streams behind it, within the time limit of the read. Inside the shell its own boundary waits
  // for the plan, so this one never shows a fallback.
  return (
    <Suspense>
      <KantoShell museumPlan={readMuseumPlan()} />
    </Suspense>
  );
}
