import type { Metadata } from "next";
import { MySpace } from "@/components/MySpace";

export const metadata: Metadata = { title: "My space" };

export default function MePage() {
  return <MySpace />;
}
