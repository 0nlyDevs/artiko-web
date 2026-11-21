import type { Metadata } from "next";
import { HeritagePage } from "@/features/heritage/heritage-page";

export const metadata: Metadata = { title: "Living Heritage Index | Artiko" };

export default function Page() {
  return <HeritagePage />;
}
