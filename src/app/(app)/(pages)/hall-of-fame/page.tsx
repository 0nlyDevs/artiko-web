import type { Metadata } from "next";
import { HallOfFamePage } from "@/features/hall-of-fame/hall-of-fame-page";
import { PageTitle } from "@/i18n/locale";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: `Hall of Fame | ${BRAND}` };

export default function Page({ searchParams }: PageProps<"/hall-of-fame">) {
  return (
    <>
      <PageTitle k="meta.hallOfFame" />
      <HallOfFamePage searchParams={searchParams} />
    </>
  );
}
