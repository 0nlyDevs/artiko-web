import type { Metadata } from "next";
import { ArtistMuseumPage, loadArtist } from "@/features/artist-museum/artist-museum-page";
import { BRAND } from "@/lib/brand";

export async function generateMetadata({ params }: PageProps<"/artists/[id]">): Promise<Metadata> {
  const artist = await loadArtist((await params).id);
  return { title: `${artist.display_name}'s museum | ${BRAND}`, description: artist.bio };
}

export default function Page({ params }: PageProps<"/artists/[id]">) {
  return <ArtistMuseumPage params={params} />;
}
