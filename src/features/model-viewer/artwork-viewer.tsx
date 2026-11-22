"use client";

import Image from "next/image";
import { useId, type Ref } from "react";
import { useT } from "@/i18n/locale";
import { loadModelViewer as defaultLoadModelViewer } from "./load-model-viewer";
import type { ModelViewerHandle } from "./model-viewer-element";
import { modelSource } from "./model-source";
import { useArtworkViewer, type ArtworkViewerDependencies } from "./use-artwork-viewer";
import { statusMessageKey, type ViewerState } from "./viewer-state";
import { cameraOrbitOf, MAX_CAMERA_ORBIT, MIN_CAMERA_ORBIT, VIEW_NAMES } from "./views";
import { isWebGLAvailable } from "./webgl";

export interface ArtworkModel {
  model1k: string;
  model2k: string | null;
  poster: string | null;
  alt: string;
}

const button = "border-2 border-ink px-3 py-1 text-sm aria-pressed:bg-ink aria-pressed:text-paper";

/** Interactive 3D view of one work: preset views, HD on demand, poster while loading or without WebGL. */
export function ArtworkViewer(props: ArtworkModel & Partial<ArtworkViewerDependencies>) {
  // Remounting on a new work resets the load, quality and error state of the previous one.
  return <ConnectedViewer key={`${props.model1k}|${props.model2k ?? ""}`} {...props} />;
}

function ConnectedViewer({
  detectWebGL = isWebGLAvailable,
  loadModelViewer = defaultLoadModelViewer,
  ...model
}: ArtworkModel & Partial<ArtworkViewerDependencies>) {
  const viewer = useArtworkViewer(model.model2k !== null, { detectWebGL, loadModelViewer });
  return <ArtworkViewerFrame model={model} {...viewer} />;
}

export interface ArtworkViewerFrameProps {
  model: ArtworkModel;
  state: ViewerState;
  webGLAvailable: boolean;
  viewerRef?: Ref<ModelViewerHandle>;
  showView: (orbit: string) => void;
  toggleHd: () => void;
  retry: () => void;
}

export function ArtworkViewerFrame({ model, state, webGLAvailable, viewerRef, showView, toggleHd, retry }: ArtworkViewerFrameProps) {
  const { t } = useT();
  const viewsLabelId = useId();
  const statusKey = webGLAvailable ? statusMessageKey(state) : "viewer.noWebgl";
  const failed = state.status === "error";
  const showModel = webGLAvailable && !failed;

  return (
    <section aria-label={t("viewer.region")} className="flex flex-col gap-3">
      <div className="relative aspect-square w-full bg-paper" aria-busy={showModel && state.status === "loading"}>
        {showModel ? (
          <model-viewer
            key={state.attempt}
            ref={viewerRef}
            className="block h-full w-full"
            src={modelSource(state.quality === "hd" && model.model2k ? model.model2k : model.model1k, state.attempt)}
            poster={model.poster ?? undefined}
            alt={model.alt}
            camera-controls
            tone-mapping="neutral"
            min-camera-orbit={MIN_CAMERA_ORBIT}
            max-camera-orbit={MAX_CAMERA_ORBIT}
          />
        ) : (
          <Still poster={model.poster} alt={model.alt} />
        )}
      </div>
      <p role="status" className="min-h-6 text-sm">{statusKey ? t(statusKey) : ""}</p>
      {webGLAvailable && failed && (
        <button type="button" onClick={retry} className={`${button} self-start bg-ink text-paper`}>{t("viewer.retry")}</button>
      )}
      {showModel && (
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-labelledby={viewsLabelId} className="flex flex-wrap items-center gap-2">
            <span id={viewsLabelId} className="font-bold">{t("viewer.views")}</span>
            {VIEW_NAMES.map((view) => (
              <button key={view} type="button" className={button} onClick={() => showView(cameraOrbitOf(view))}>
                {t(`viewer.view.${view}`)}
              </button>
            ))}
          </div>
          {state.hdAvailable && (
            <button type="button" className={button} aria-pressed={state.quality === "hd"} aria-label={t("viewer.hd")} onClick={toggleHd}>
              HD
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function Still({ poster, alt }: { poster: string | null; alt: string }) {
  const { t } = useT();
  if (!poster) {
    return <div className="flex h-full items-center justify-center font-bold">{t("viewer.fallbackLabel")}</div>;
  }
  // Unoptimized: the publish preview shows a blob: URL, which the image optimizer cannot fetch.
  return <Image src={poster} alt={alt} fill unoptimized className="object-contain" />;
}
