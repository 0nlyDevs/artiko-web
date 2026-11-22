"use client";

import { ArtworkViewer } from "@/features/model-viewer/artwork-viewer";
import { useT } from "@/i18n/locale";
import { formatBytes } from "./format-bytes";
import type { ImportedModel, ImportStep } from "./import-model";
import type { ImportState, PreviewUrls } from "./import-state";

/** Progress, error, or preview with file sizes of the model being prepared in the publish form. */
export function ModelImportPanel({ state, alt }: { state: ImportState; alt: string }) {
  const { t } = useT();
  switch (state.status) {
    case "idle":
      return null;
    case "running":
      return <ImportProgress steps={state.steps} current={state.current} />;
    case "failed":
      return <p role="alert" className="border-l-4 border-red pl-3">{t(`import.error.${state.code}`)}</p>;
    case "ready":
      return <ImportPreview model={state.model} preview={state.preview} alt={alt} />;
  }
}

function ImportProgress({ steps, current }: { steps: readonly ImportStep[]; current: ImportStep | null }) {
  const { t } = useT();
  const currentIndex = current === null ? -1 : steps.indexOf(current);
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-2">
      <p className="font-bold">{t("import.preparing")}</p>
      <ol className="flex flex-col gap-1">
        {steps.map((step, index) => {
          const progress = index < currentIndex ? "done" : index === currentIndex ? "current" : "pending";
          return (
            <li key={step} aria-current={progress === "current" ? "step" : undefined} className={progress === "pending" ? "opacity-60" : ""}>
              {t(`import.progress.${progress}`, { step: t(`import.step.${step}`) })}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function ImportPreview({ model, preview, alt }: { model: ImportedModel; preview: PreviewUrls; alt: string }) {
  const { t, locale } = useT();
  const sizes = [
    { key: "1k", label: t("import.size.1k"), bytes: model.model1k.size },
    { key: "2k", label: t("import.size.2k"), bytes: model.model2k.size },
    { key: "poster", label: t("import.size.poster"), bytes: model.poster.size },
  ] as const;
  return (
    <div className="flex flex-col gap-3">
      <ArtworkViewer model1k={preview.model1k} model2k={preview.model2k} poster={preview.poster} alt={alt} />
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        {sizes.map(({ key, label, bytes }) => (
          <div key={key} className="contents">
            <dt>{label}</dt>
            <dd>{formatBytes(bytes, locale)}</dd>
          </div>
        ))}
      </dl>
      {model.oversized.length > 0 && (
        <p role="alert" className="border-l-4 border-red pl-3">
          {t("import.oversized", { variants: model.oversized.map((variant) => t(`import.size.${variant}`)).join(", ") })}
        </p>
      )}
    </div>
  );
}
