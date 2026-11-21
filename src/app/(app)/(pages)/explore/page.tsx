import type { Metadata } from "next";
import { ExplorePage } from "@/features/explore/explore-page";

export const metadata: Metadata = { title: "Explore | Artiko" };

export default function Page({ searchParams }: PageProps<"/explore">) {
  return <ExplorePage searchParams={searchParams} />;
}
