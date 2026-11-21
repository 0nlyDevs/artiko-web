import type { Metadata } from "next";
import { ScanPage } from "@/features/scan/scan-page";

export const metadata: Metadata = { title: "Check a photo | Artiko" };

export default function Page() {
  return <ScanPage />;
}
