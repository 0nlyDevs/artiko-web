import { cx } from '../../lib/cx';
import styles from './Stepper.module.css';

export interface StepperStep {
  label: string;
}

export interface StepperProps {
  steps: readonly StepperStep[];
  /** Zero-based current step. */
  current: number;
  /** Lets the visitor go back to a completed step. */
  onEdit?: ((index: number) => void) | undefined;
  className?: string | undefined;
}

/** Figma Contribuer: numbered steps, a check once done, "Modifier" on completed ones. */
export function Stepper({ steps, current, onEdit, className }: StepperProps) {
  return (
    <ol className={cx(styles.list, className)} aria-label="Étapes">
      {steps.map((step, index) => {
        const done = index < current;
        const isCurrent = index === current;
        return (
          <li
            key={step.label}
            className={cx(
              styles.step,
              done && styles.done,
              isCurrent && styles.current,
            )}
            aria-current={isCurrent ? 'step' : undefined}
          >
            <span className={styles.number} aria-hidden="true">
              {done ? '✓' : String(index + 1).padStart(2, '0')}
            </span>
            <span className={styles.label}>{step.label}</span>
            {done && onEdit !== undefined && (
              <button
                type="button"
                className={styles.edit}
                onClick={() => {
                  onEdit(index);
                }}
              >
                Modifier
                <span className="visually-hidden"> l’étape {step.label}</span>
              </button>
            )}
          </li>
        );
      })}
    </ol>
  );
}
