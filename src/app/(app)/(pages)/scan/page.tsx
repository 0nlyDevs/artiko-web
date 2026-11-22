import type { Metadata } from "next";
import { ScanPage } from "@/features/scan/scan-page";
import { PageTitle } from "@/i18n/locale";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: `Check a photo | ${BRAND}` };

export default function Page() {
  return (
    <>
      <PageTitle k="meta.scan" />
      <ScanPage />
    </>
  );
}
