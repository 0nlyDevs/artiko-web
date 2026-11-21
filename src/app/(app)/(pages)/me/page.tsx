import type { Metadata } from "next";
import { ArtistSpacePage } from "@/features/artist-space/artist-space-page";

export const metadata: Metadata = { title: "My space | Artiko" };

export default function Page() {
  return <ArtistSpacePage />;
}
