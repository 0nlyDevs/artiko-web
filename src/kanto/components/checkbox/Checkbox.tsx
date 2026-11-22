import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';
import styles from './Checkbox.module.css';

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  hint?: ReactNode | undefined;
  invalid?: boolean | undefined;
  disabled?: boolean | undefined;
  className?: string | undefined;
}

/** Figma "Cases à cocher", used for the consents of step 3. */
export function Checkbox({
  checked,
  onChange,
  label,
  hint,
  invalid = false,
  disabled = false,
  className,
}: CheckboxProps) {
  return (
    <label className={cx(styles.wrap, invalid && styles.invalid, className)}>
      <input
        className={styles.input}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        onChange={(event) => {
          onChange(event.target.checked);
        }}
      />
      <span className={styles.box} aria-hidden="true" />
      <span className={styles.text}>
        <span className={styles.label}>{label}</span>
        {hint !== undefined && <span className={styles.hint}>{hint}</span>}
      </span>
    </label>
  );
}
