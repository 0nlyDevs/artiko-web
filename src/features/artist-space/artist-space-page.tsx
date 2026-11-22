import { Suspense } from "react";
import { MySpace } from "@/features/artist-space/my-space";

// The session lives in the browser (Better Auth), so the space renders client-side; it reads `?tab=`.
export function ArtistSpacePage() {
  return (
    <Suspense>
      <MySpace />
    </Suspense>
  );
}
