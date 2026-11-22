import { MissingState } from "@/features/artist-museum/missing-state";

/** An artist the API does not know (404, or an id that is not one): for the profile and for the 3D room. */
export default function NotFound() {
  return <MissingState title="missing.artist.title" />;
}
