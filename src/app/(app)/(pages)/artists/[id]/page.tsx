import type { Metadata } from "next";
import { ArtistMuseumPage, loadMuseum } from "@/features/artist-museum/artist-museum-page";

export async function generateMetadata({ params }: PageProps<"/artists/[id]">): Promise<Metadata> {
  const { artist } = await loadMuseum((await params).id);
  return { title: `${artist.display_name}'s museum | Artiko`, description: artist.bio };
}

export default function Page({ params }: PageProps<"/artists/[id]">) {
  return <ArtistMuseumPage params={params} />;
}
