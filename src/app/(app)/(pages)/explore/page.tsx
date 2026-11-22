import type { Metadata } from "next";
import { ExplorePage } from "@/features/explore/explore-page";
import { PageTitle } from "@/i18n/locale";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: `Explore | ${BRAND}` };

export default function Page({ searchParams }: PageProps<"/explore">) {
  return (
    <>
      <PageTitle k="meta.explore" />
      <ExplorePage searchParams={searchParams} />
    </>
  );
}
