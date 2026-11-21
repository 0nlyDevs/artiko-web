import type { Metadata } from "next";
import { ArtistSpacePage } from "@/features/artist-space/artist-space-page";
import { PageTitle } from "@/i18n/locale";

export const metadata: Metadata = { title: "My space | Artiko" };

export default function Page() {
  return (
    <>
      <PageTitle k="meta.mySpace" />
      <ArtistSpacePage />
    </>
  );
}
