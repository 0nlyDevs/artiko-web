"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createModelImport, type DisposableModelImport } from "./create-model-import";
import { importModel, type ImportedModel } from "./import-model";
import { errorCodeOf, stepsFor, type ImportState, type PreviewUrls } from "./import-state";

/** Runs one import at a time; choosing another file or leaving the page cancels the running one. */
export function useModelImport(create: () => DisposableModelImport = createModelImport) {
  const [state, setState] = useState<ImportState>({ status: "idle" });
  const running = useRef<DisposableModelImport | null>(null);
  const preview = useRef<PreviewUrls | null>(null);

  const cancel = useCallback(() => {
    running.current?.dispose();
    running.current = null;
    if (preview.current) Object.values(preview.current).forEach((url) => URL.revokeObjectURL(url));
    preview.current = null;
  }, []);

  useEffect(() => cancel, [cancel]);

  const start = useCallback(
    async (file: File) => {
      cancel();
      const steps = stepsFor(file);
      let run: DisposableModelImport;
      try {
        run = create();
      } catch (error) {
        setState({ status: "failed", code: errorCodeOf(error) });
        return;
      }
      running.current = run;
      const isCurrent = () => running.current === run;
      setState({ status: "running", steps, current: null });
      try {
        const model = await importModel(file, run, (current) => {
          if (isCurrent()) setState({ status: "running", steps, current });
        });
        if (isCurrent()) {
          preview.current = previewUrlsOf(model);
          setState({ status: "ready", model, preview: preview.current });
        }
      } catch (error) {
        if (isCurrent()) setState({ status: "failed", code: errorCodeOf(error) });
      } finally {
        if (isCurrent()) {
          run.dispose();
          running.current = null;
        }
      }
    },
    [cancel, create],
  );

  const reset = useCallback(() => {
    cancel();
    setState({ status: "idle" });
  }, [cancel]);

  return { state, start, reset };
}

function previewUrlsOf(model: ImportedModel): PreviewUrls {
  return {
    model1k: URL.createObjectURL(model.model1k),
    model2k: URL.createObjectURL(model.model2k),
    poster: URL.createObjectURL(model.poster),
  };
}
