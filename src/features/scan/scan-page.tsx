import { ScanForm } from "@/features/scan/scan-form";
import { T } from "@/i18n/locale";

export function ScanPage() {
  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-8">
      <div className="max-w-[66ch]">
        <h1 className="text-[32px] leading-none font-extrabold tracking-[-0.04em]">
          <T k="scan.title" />
        </h1>
        <p className="mt-2.5 leading-relaxed">
          <T k="scan.intro" />
        </p>
      </div>
      <ScanForm />
    </div>
  );
}
