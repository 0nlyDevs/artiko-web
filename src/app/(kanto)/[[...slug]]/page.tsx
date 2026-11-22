import { KantoShell } from "@/kanto/KantoShell";

// One optional catch-all route serves every KANTO address (/, /musee/…, /oeuvres, /contribuer/…,
// /numerisation/…, /admin…). The KANTO router reads the address in the browser and moves with the
// native History API, which Next integrates, so the WebGL room never remounts between works.
// Routes declared elsewhere in src/app (/explore, /scan, /api/auth/…) keep precedence.
export default function KantoPage() {
  return <KantoShell />;
}
