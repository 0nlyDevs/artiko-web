import { useState } from 'react';
import type { ImportStep } from '@/features/model-import/import-model';
import { matchRoute, paths } from '../../../app/routes';
import { cx } from '../../../lib/cx';
import { Link } from '../../../lib/router/Link';
import { useLocationPath } from '../../../lib/router/router';
import { formatBytes } from '../contribute-content';
import {
  IMPORT_PANEL_LABEL,
  IMPORT_PREPARING,
  IMPORT_SENDING,
  IMPORT_SIZE_LABEL,
  importNotice,
  importStepProgress,
  type ImportStepProgress,
} from '../model-import-copy';
import styles from '../WizardPage.module.css';
import {
  isModelImportBusy,
  modelImportSession,
  useModelImportState,
  type ModelSizes,
} from './model-import-session';

export interface ImportProgressProps {
  fileName: string;
  steps: readonly ImportStep[];
  current: ImportStep | null;
  onCancel: () => void;
}

/**
 * The steps of a scan being prepared in the browser, with the running one
 * marked. Nothing here is a live region: the media step announces the running
 * step in one sentence, so a screen reader does not hear the panel again at
 * every step.
 */
export function ImportProgress({
  fileName,
  steps,
  current,
  onCancel,
}: ImportProgressProps) {
  const currentIndex = current === null ? -1 : steps.indexOf(current);
  return (
    <div
      className={styles.importPanel}
      role="group"
      aria-label={IMPORT_PANEL_LABEL}
    >
      <p className={styles.importTitle}>{IMPORT_PREPARING}</p>
      <p className={styles.thumbMeta}>{fileName}</p>
      <ol className={styles.importSteps}>
        {steps.map((step, index) => {
          const progress: ImportStepProgress =
            index < currentIndex
              ? 'done'
              : index === currentIndex
                ? 'current'
                : 'pending';
          return (
            <li
              key={step}
              className={cx(
                styles.importStep,
                progress === 'current' && styles.importStepCurrent,
                progress === 'pending' && styles.importStepPending,
              )}
              aria-current={progress === 'current' ? 'step' : undefined}
            >
              {importStepProgress(step, progress)}
            </li>
          );
        })}
      </ol>
      <button type="button" className={styles.textAction} onClick={onCancel}>
        Annuler la préparation
      </button>
    </div>
  );
}

/** The model on its way to the server. The percentage is shown, not announced. */
export function ImportUpload({
  fileName,
  progress,
}: {
  fileName: string;
  progress: number;
}) {
  const percent = `${String(Math.round(progress * 100))} %`;
  return (
    <div className={styles.importUpload}>
      <p className={cx(styles.thumbMeta, styles.thumbProgress)}>
        {IMPORT_SENDING} {percent}
      </p>
      <p className={styles.thumbMeta}>{fileName}</p>
      <span className={styles.progressLine} aria-hidden="true">
        <span
          className={styles.progressBar}
          style={{ width: `${String(Math.round(progress * 100))}%` }}
        />
      </span>
    </div>
  );
}

/** Weight of the three files produced from one scan. */
export function ImportSizes({ sizes }: { sizes: ModelSizes }) {
  const rows = [
    { key: 'model1k', bytes: sizes.model1k },
    { key: 'model2k', bytes: sizes.model2k },
    { key: 'poster', bytes: sizes.poster },
  ] as const;
  return (
    <dl className={styles.importSizes}>
      {rows.map(({ key, bytes }) => (
        <div key={key} className={styles.importSize}>
          <dt>{IMPORT_SIZE_LABEL[key]}</dt>
          <dd>{formatBytes(bytes)}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * On the steps other than Médias: where the 3D model stands while it is
 * prepared or sent in the background, and what went wrong if it could not be
 * added. The draft is found from the address when the step does not hold it.
 */
export function ModelImportNotice({
  itemId,
  beforeSending = false,
}: {
  itemId?: string | undefined;
  /** On the last step: the advice is to wait for the model before sending. */
  beforeSending?: boolean | undefined;
}) {
  const route = matchRoute(useLocationPath());
  const id = itemId ?? (route.kind === 'wizard' ? route.itemId : null);
  const state = useModelImportState(id);
  // Confirming "model added" is for the step that saw it on its way.
  const [witnessed] = useState(
    () => id !== null && isModelImportBusy(modelImportSession(id).getState()),
  );
  const notice = importNotice(state, witnessed, beforeSending);
  return (
    <div
      className={
        notice === null
          ? 'visually-hidden'
          : cx(
              styles.importNotice,
              notice.tone === 'error' && styles.importNoticeError,
            )
      }
      role="status"
    >
      {notice !== null && (
        <>
          <span>{notice.text}</span>
          {notice.tone === 'error' && id !== null && (
            <Link to={paths.wizard(id, 2)}>Revenir aux médias</Link>
          )}
        </>
      )}
    </div>
  );
}
