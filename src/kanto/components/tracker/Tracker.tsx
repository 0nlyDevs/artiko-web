import { cx } from '../../lib/cx';
import styles from './Tracker.module.css';

export type TrackerState = 'done' | 'active' | 'upcoming' | 'failed';

export interface TrackerStep {
  title: string;
  detail?: string | undefined;
  state: TrackerState;
}

export interface TrackerProps {
  steps: readonly TrackerStep[];
  className?: string | undefined;
}

/** Figma B5 tracker: Reçue → En relecture → Accrochée, reused for scans and mints. */
export function Tracker({ steps, className }: TrackerProps) {
  return (
    <ol className={cx(styles.list, className)}>
      {steps.map((step) => (
        <li
          key={step.title}
          className={cx(styles.item, styles[step.state])}
          aria-current={step.state === 'active' ? 'step' : undefined}
        >
          <span className={styles.dot} aria-hidden="true">
            {step.state === 'done' ? '✓' : step.state === 'failed' ? '!' : ''}
          </span>
          <span className={styles.text}>
            <span className={styles.title}>
              {step.title}
              <span className="visually-hidden">
                {step.state === 'done'
                  ? ' (terminé)'
                  : step.state === 'active'
                    ? ' (en cours)'
                    : step.state === 'failed'
                      ? ' (échec)'
                      : ' (à venir)'}
              </span>
            </span>
            {step.detail !== undefined && (
              <span className={styles.detail}>{step.detail}</span>
            )}
          </span>
        </li>
      ))}
    </ol>
  );
}
