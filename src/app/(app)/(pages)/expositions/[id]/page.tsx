import type { Metadata } from "next";
import { ExpositionPage } from "@/features/exposition/exposition-page";
import { loadExposition } from "@/features/exposition/load-exposition";
import { BRAND } from "@/lib/brand";

export async function generateMetadata({ params }: PageProps<"/expositions/[id]">): Promise<Metadata> {
  const exposition = await loadExposition((await params).id);
  return { title: `${exposition.title}, an exposition by ${exposition.artist_name} | ${BRAND}`, description: exposition.description || undefined };
}

export default function Page({ params }: PageProps<"/expositions/[id]">) {
  return <ExpositionPage params={params} />;
}
