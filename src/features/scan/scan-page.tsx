import { ScanForm } from "@/features/scan/scan-form";
import { T } from "@/i18n/locale";

export function ScanPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h1 className="font-heading text-7xl">
          <T k="scan.title" />
        </h1>
        <p className="max-w-2xl text-xl">
          <T k="scan.intro" />
        </p>
      </div>
      <ScanForm />
    </div>
  );
}
