import type { Metadata } from "next";
import { HeritagePage } from "@/features/heritage/heritage-page";
import { PageTitle } from "@/i18n/locale";

export const metadata: Metadata = { title: "Living Heritage Index | Artiko" };

export default function Page() {
  return (
    <>
      <PageTitle k="meta.heritage" />
      <HeritagePage />
    </>
  );
}
