import type { Metadata } from "next";
import { HeritagePage } from "@/features/heritage/heritage-page";
import { PageTitle } from "@/i18n/locale";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: `Living Heritage Index | ${BRAND}` };

export default function Page() {
  return (
    <>
      <PageTitle k="meta.heritage" />
      <HeritagePage />
    </>
  );
}
