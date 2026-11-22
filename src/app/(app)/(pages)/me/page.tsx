import type { Metadata } from "next";
import { ArtistSpacePage } from "@/features/artist-space/artist-space-page";
import { PageTitle } from "@/i18n/locale";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: `My space | ${BRAND}` };

export default function Page() {
  return (
    <>
      <PageTitle k="meta.mySpace" />
      <ArtistSpacePage />
    </>
  );
}
