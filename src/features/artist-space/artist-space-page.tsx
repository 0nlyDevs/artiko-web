import { MySpace } from "@/features/artist-space/my-space";

// The session lives in the browser (Better Auth), so the space renders client-side.
export function ArtistSpacePage() {
  return <MySpace />;
}
