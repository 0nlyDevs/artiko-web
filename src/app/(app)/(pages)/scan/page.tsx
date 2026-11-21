import type { Metadata } from "next";
import { ScanPage } from "@/features/scan/scan-page";
import { PageTitle } from "@/i18n/locale";

export const metadata: Metadata = { title: "Check a photo | Artiko" };

export default function Page() {
  return (
    <>
      <PageTitle k="meta.scan" />
      <ScanPage />
    </>
  );
}
