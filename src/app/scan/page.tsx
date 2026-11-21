import type { Metadata } from "next";
import { ScanForm } from "@/components/ScanForm";

export const metadata: Metadata = { title: "Check a photo" };

export default function ScanPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h1 className="text-5xl font-extrabold tracking-tighter">Check a photo</h1>
        <p className="max-w-2xl text-xl">
          Send a photo of a painting, a print, a poster or a screen. Artiko tells you which work it is,
          who made it, and whether it is proven human-made. The photo is not kept.
        </p>
      </div>
      <ScanForm />
    </div>
  );
}
