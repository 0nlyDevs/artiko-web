"use client";

import { useId, useRef, useState, type DragEvent, type ReactNode } from "react";
import { useT } from "@/i18n/locale";
import styles from "@/kanto/components/drop-zone/DropZone.module.css";
import { cx } from "./cx";

export interface DropZoneProps {
  /** Invitation line, for example « Glissez votre fichier ici ». It also names the file input. */
  title: string;
  hint?: ReactNode;
  /** `accept` of the file input, for example "image/*,.glb". */
  accept?: string;
  /** One file by default: a work is one file. */
  multiple?: boolean;
  disabled?: boolean;
  error?: string;
  /** Shows a label and a progress bar in place of the invitation; `progress` goes from 0 to 1. */
  busy?: { label: string; progress: number };
  /** `name` of the file input, for a form read with FormData. */
  name?: string;
  onFiles: (files: File[]) => void;
  className?: string;
}

/** Figma « Zone de dépôt » with its rest, drag-over, sending and error states. Same drawing as KANTO's, in three languages. */
export function DropZone({ title, hint, accept, multiple = false, disabled = false, error, busy, name, onFiles, className }: DropZoneProps) {
  const { t } = useT();
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const take = (list: FileList | null) => {
    if (list === null || disabled) return;
    const files = Array.from(list);
    if (files.length > 0) onFiles(multiple ? files : files.slice(0, 1));
  };
  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setOver(false);
    take(event.dataTransfer.files);
  };
  const percent = busy ? Math.round(Math.min(1, Math.max(0, busy.progress)) * 100) : 0;

  return (
    <div
      className={cx(styles.zone, over && styles.over, error !== undefined && styles.invalid, disabled && styles.disabled, className)}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
    >
      <span className={styles.icon} aria-hidden="true">
        ↑
      </span>
      <span className={styles.title} role={error !== undefined ? "alert" : undefined}>
        {error ?? (busy !== undefined ? busy.label : over ? t("kit.drop.over") : title)}
      </span>
      {busy === undefined && (
        <span className={styles.browse}>
          {t("kit.drop.or")}{" "}
          <button type="button" className={styles.link} disabled={disabled} onClick={() => input.current?.click()}>
            {t("kit.drop.browse")}
          </button>
        </span>
      )}
      {busy !== undefined ? (
        <span className={styles.progress} role="progressbar" aria-label={busy.label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
          <span className={styles.bar} style={{ width: `${percent}%` }} />
        </span>
      ) : (
        hint !== undefined && <span className={styles.hint}>{hint}</span>
      )}
      <input
        ref={input}
        id={inputId}
        name={name}
        className={styles.input}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        aria-label={title}
        onChange={(event) => {
          take(event.target.files);
          // With a `name` the form reads the file from this input: it must keep it.
          if (name === undefined) event.target.value = "";
        }}
      />
    </div>
  );
}
