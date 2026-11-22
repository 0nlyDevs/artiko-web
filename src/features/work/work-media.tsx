"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useState, type ReactNode } from "react";
import { useT } from "@/i18n/locale";
import gilded from "@/kanto/assets/gallery/frame-gilded-1200.webp";
import type { Work } from "@/lib/api";
import styles from "./work-media.module.css";

// model-viewer and the WebGL check only exist in the browser.
const ArtworkViewer = dynamic(() => import("@/features/model-viewer/artwork-viewer").then((m) => m.ArtworkViewer), { ssr: false });

type Shape = "portrait" | "landscape";

/** A picture in the gilded frame of the mockup. The frame lies on its side for a landscape picture, so the work is never cropped. */
function FramedPicture({ src, alt, children }: { src: string; alt: string; children?: ReactNode }) {
  const [shape, setShape] = useState<Shape | null>(null);
  return (
    <figure className={[styles.frame, shape === "landscape" && styles.landscape, shape === null && styles.unhung].filter(Boolean).join(" ")} data-shape={shape ?? undefined}>
      <div className={styles.opening}>
        <Image
          src={src}
          alt={alt}
          fill
          priority
          sizes="(min-width: 1024px) 40vw, 80vw"
          className={styles.picture}
          onLoad={(event) => setShape(event.currentTarget.naturalWidth > event.currentTarget.naturalHeight ? "landscape" : "portrait")}
          // A picture that does not load leaves the frame upright on its dark ground.
          onError={() => setShape("portrait")}
        />
        {children}
      </div>
      {/* Decoration only: the picture inside carries the text alternative. */}
      <span className={styles.moulding} aria-hidden="true">
        <Image className={styles.gilded} src={gilded} sizes="(min-width: 1024px) 800px, 120vw" alt="" />
      </span>
    </figure>
  );
}

export interface WorkMediaProps {
  work: Work;
  /** A double-click on a picture; players keep theirs (full screen, seeking). */
  onDoubleClick?: () => void;
  /** Tooltip of the picture, such as « Double-cliquez pour voter ». */
  hint?: string;
  /** Laid over the picture: the heart of a vote cast by double-click. */
  children?: ReactNode;
}

/** The work as the room shows it, one rendering per `media_kind`: image, audio, video, model. */
export function WorkMedia({ work, onDoubleClick, hint, children }: WorkMediaProps) {
  const { t } = useT();
  const alt = t("work.alt", { title: work.title, artist: work.artist_name });

  if (work.media_kind === "image")
    return (
      <div className={styles.media} data-kind="image" onDoubleClick={onDoubleClick} title={hint}>
        <FramedPicture key={work.media_url} src={work.media_url} alt={alt}>
          {children}
        </FramedPicture>
      </div>
    );

  if (work.media_kind === "video")
    return (
      <div className={styles.media} data-kind="video">
        <div className={styles.screen}>
          <video controls preload="metadata" src={work.media_url} aria-label={alt} className={styles.video} />
        </div>
      </div>
    );

  if (work.media_kind === "audio")
    return (
      <div className={styles.media} data-kind="audio">
        <div className={styles.plate}>
          <p className={styles.plateKind}>{t("work.kind.audio")}</p>
          <p className={styles.plateTitle}>{work.title}</p>
          <audio controls preload="metadata" src={work.media_url} aria-label={alt} className={styles.audio} />
        </div>
      </div>
    );

  return (
    <div className={styles.media} data-kind="model">
      <div className={`${styles.plate} ${styles.model}`}>
        <p className={styles.plateKind}>{t("work.kind.model")}</p>
        <ArtworkViewer model1k={work.media_url} model2k={work.media_hd_url ?? null} poster={work.poster_url ?? null} alt={alt} />
      </div>
    </div>
  );
}
