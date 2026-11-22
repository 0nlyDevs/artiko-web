"use client";

import { ArtworkViewer } from "@/features/model-viewer/artwork-viewer";
import { useT } from "@/i18n/locale";
// The panel lives in the publication form: its KANTO dress is kept with the styles of that screen.
import styles from "@/features/artist-space/publish/model-import-panel.module.css";
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
      return <p role="alert" className={styles.error}>{t(`import.error.${state.code}`)}</p>;
    case "ready":
      return <ImportPreview model={state.model} preview={state.preview} alt={alt} />;
  }
}

function ImportProgress({ steps, current }: { steps: readonly ImportStep[]; current: ImportStep | null }) {
  const { t } = useT();
  const currentIndex = current === null ? -1 : steps.indexOf(current);
  return (
    <div role="status" aria-live="polite" className={styles.progress}>
      <p className={styles.title}>{t("import.preparing")}</p>
      <ol className={styles.steps}>
        {steps.map((step, index) => {
          const progress = index < currentIndex ? "done" : index === currentIndex ? "current" : "pending";
          return (
            <li key={step} aria-current={progress === "current" ? "step" : undefined} data-progress={progress}>
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
    <div className={styles.preview}>
      <ArtworkViewer model1k={preview.model1k} model2k={preview.model2k} poster={preview.poster} alt={alt} />
      <dl className={styles.sizes}>
        {sizes.map(({ key, label, bytes }) => (
          <div key={key} className={styles.sizeRow}>
            <dt>{label}</dt>
            <dd>{formatBytes(bytes, locale)}</dd>
          </div>
        ))}
      </dl>
      {model.oversized.length > 0 && (
        <p role="alert" className={styles.error}>
          {t("import.oversized", { variants: model.oversized.map((variant) => t(`import.size.${variant}`)).join(", ") })}
        </p>
      )}
    </div>
  );
}
