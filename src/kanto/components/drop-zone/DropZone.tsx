import type { DragEvent, ReactNode } from 'react';
import { useId, useRef, useState } from 'react';
import { cx } from '../../lib/cx';
import styles from './DropZone.module.css';

export interface DropZoneProps {
  /** Invitation line, for example "Glissez vos images ici". */
  title: string;
  hint?: ReactNode | undefined;
  /** `accept` of the file input, for example "image/*,.heic". */
  accept?: string | undefined;
  multiple?: boolean | undefined;
  disabled?: boolean | undefined;
  error?: string | undefined;
  /** Shows "Envoi de n fichiers…" with a progress bar. */
  busy?: { label: string; progress: number } | undefined;
  onFiles: (files: File[]) => void;
  className?: string | undefined;
}

/** Figma "Zone de dépôt" with its rest, drag-over, sending and error states. */
export function DropZone({
  title,
  hint,
  accept,
  multiple = true,
  disabled = false,
  error,
  busy,
  onFiles,
  className,
}: DropZoneProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const handleFiles = (list: FileList | null): void => {
    if (list === null || disabled) {
      return;
    }
    const files = Array.from(list);
    if (files.length > 0) {
      onFiles(multiple ? files : files.slice(0, 1));
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setOver(false);
    handleFiles(event.dataTransfer.files);
  };

  return (
    <div
      className={cx(
        styles.zone,
        over && styles.over,
        error !== undefined && styles.invalid,
        disabled && styles.disabled,
        className,
      )}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) {
          setOver(true);
        }
      }}
      onDragLeave={() => {
        setOver(false);
      }}
      onDrop={handleDrop}
    >
      <span className={styles.icon} aria-hidden="true">
        ↑
      </span>
      <span className={styles.title}>
        {error ??
          (busy !== undefined ? busy.label : over ? 'Déposez ici' : title)}
      </span>
      {busy === undefined && (
        <span className={styles.browse}>
          ou{' '}
          <button
            type="button"
            className={styles.link}
            disabled={disabled}
            onClick={() => {
              inputRef.current?.click();
            }}
          >
            parcourir votre appareil
          </button>
        </span>
      )}
      {busy !== undefined ? (
        <span
          className={styles.progress}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(busy.progress * 100)}
        >
          <span
            className={styles.bar}
            style={{ width: `${String(Math.round(busy.progress * 100))}%` }}
          />
        </span>
      ) : (
        hint !== undefined && <span className={styles.hint}>{hint}</span>
      )}
      <input
        ref={inputRef}
        id={inputId}
        className={styles.input}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        aria-label={title}
        onChange={(event) => {
          handleFiles(event.target.files);
          event.target.value = '';
        }}
      />
    </div>
  );
}
