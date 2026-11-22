import type { Metadata } from "next";
import { loadWork, WorkPage } from "@/features/work/work-page";
import { BRAND } from "@/lib/brand";

export async function generateMetadata({ params }: PageProps<"/works/[id]">): Promise<Metadata> {
  const work = await loadWork((await params).id);
  return { title: `${work.title}, ${work.artist_name} | ${BRAND}`, description: work.story || undefined };
}

export default function Page({ params }: PageProps<"/works/[id]">) {
  return <WorkPage params={params} />;
}
