import { MissingState } from "@/features/artist-museum/missing-state";

/** An exposition the API does not know (404, or an id that is not one). */
export default function NotFound() {
  return <MissingState title="missing.exposition.title" />;
}
