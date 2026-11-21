import type { Metadata } from "next";
import { HallOfFamePage } from "@/features/hall-of-fame/hall-of-fame-page";
import { PageTitle } from "@/i18n/locale";

export const metadata: Metadata = { title: "Hall of Fame | Artiko" };

export default function Page({ searchParams }: PageProps<"/hall-of-fame">) {
  return (
    <>
      <PageTitle k="meta.hallOfFame" />
      <HallOfFamePage searchParams={searchParams} />
    </>
  );
}
