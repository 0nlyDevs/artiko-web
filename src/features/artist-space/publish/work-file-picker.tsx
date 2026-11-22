"use client";

import { useRef, useState, type DragEvent, type ReactNode } from "react";
import { useT } from "@/i18n/locale";
import zone from "@/kanto/components/drop-zone/DropZone.module.css";
import { cx } from "@/lib/ui/kanto/cx";
import { ACCEPT_WORK, type MediaKind } from "./file-checks";
import { FileThumb } from "./file-thumb";
import styles from "./publish.module.css";

export interface WorkFilePickerProps {
  file: File | null;
  kind: MediaKind | null;
  /** A local address of the picture to show: the image itself, or the poster of a prepared 3D model. */
  previewUrl: string | null;
  /** What the browser read of the file, already joined: « Image JPG · 6,1 Mo sur 20 Mo · 4 032 × 5 040 px ». */
  meta: ReactNode;
  /** A sentence under the meta line, for a file shown as it is in the room. */
  note?: ReactNode;
  /** Why the last chosen file was refused, or that a file is missing. */
  error: string | null;
  disabled?: boolean;
  onChoose: (file: File) => void;
  onRemove: () => void;
}

/**
 * The file of the work, frame R1. Before a choice it is the KANTO drop zone; after it, the card of the frame
 * with « Remplacer » and « Retirer ». One file input serves both states and keeps the id the form always had.
 */
export function WorkFilePicker({ file, kind, previewUrl, meta, note, error, disabled = false, onChoose, onRemove }: WorkFilePickerProps) {
  const { t } = useT();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const drag = {
    onDragOver: (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (!disabled) setOver(true);
    },
    onDragLeave: () => setOver(false),
    onDrop: (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setOver(false);
      const dropped = event.dataTransfer.files[0];
      if (dropped && !disabled) onChoose(dropped);
    },
  };
  const browse = () => input.current?.click();

  return (
    <div>
      {file ? (
        <div className={styles.fileCard} data-over={over} {...drag}>
          <FileThumb url={previewUrl} kind={kind} />
          <div className={styles.fileBody}>
            <p className={styles.fileName}>{file.name}</p>
            <p className={styles.fileMeta}>{meta}</p>
            {note !== undefined && <p className={styles.fileMeta}>{note}</p>}
            <div className={styles.links}>
              <button type="button" className={styles.textLink} disabled={disabled} onClick={browse} aria-label={t("publish.file.replaceAria", { name: file.name })}>
                {t("publish.file.replace")}
              </button>
              <button type="button" className={styles.textLink} disabled={disabled} onClick={onRemove} aria-label={t("publish.removeProof", { name: file.name })}>
                {t("publish.file.remove")}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className={cx(zone.zone, over && zone.over, error !== null && zone.invalid, disabled && zone.disabled)} {...drag}>
          <span className={zone.icon} aria-hidden="true">
            ↑
          </span>
          <span className={zone.title}>{over ? t("kit.drop.over") : t("publish.file.drop")}</span>
          <span className={zone.browse}>
            {t("kit.drop.or")}{" "}
            <button type="button" className={zone.link} disabled={disabled} onClick={browse} aria-describedby="file-help">
              {t("kit.drop.browse")}
            </button>
          </span>
          <span id="file-help" className={zone.hint}>
            {t("publish.fileHelp")}
          </span>
        </div>
      )}
      {/* The buttons above open it; it stays out of the tab order so the keyboard meets one control, not two. */}
      <input
        ref={input}
        id="file"
        name="file"
        type="file"
        className="visually-hidden"
        tabIndex={-1}
        accept={ACCEPT_WORK}
        disabled={disabled}
        aria-label={t("publish.section.file")}
        onChange={(event) => {
          const chosen = event.target.files?.[0];
          // The form keeps the file itself: emptying the input lets the same file be chosen again.
          event.target.value = "";
          if (chosen) onChoose(chosen);
        }}
      />
      {error !== null && (
        <p role="alert" className={styles.fileError}>
          {error}
        </p>
      )}
    </div>
  );
}
