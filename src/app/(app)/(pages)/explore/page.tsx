import type { Metadata } from "next";
import { ExplorePage } from "@/features/explore/explore-page";
import { PageTitle } from "@/i18n/locale";

export const metadata: Metadata = { title: "Explore | Artiko" };

export default function Page({ searchParams }: PageProps<"/explore">) {
  return (
    <>
      <PageTitle k="meta.explore" />
      <ExplorePage searchParams={searchParams} />
    </>
  );
}
