import type { Metadata } from "next";
import { loadArtist } from "@/features/artist-museum/artist-museum-page";
import { WalkPage } from "@/features/artist-museum/walk-page";

export async function generateMetadata({ params }: PageProps<"/artists/[id]/museum">): Promise<Metadata> {
  const artist = await loadArtist((await params).id);
  return { title: `${artist.display_name}'s 3D museum | Artiko` };
}

export default function Page({ params }: PageProps<"/artists/[id]/museum">) {
  return <WalkPage params={params} />;
}
