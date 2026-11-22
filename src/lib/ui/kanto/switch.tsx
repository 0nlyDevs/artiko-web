import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cx } from "./cx";
import styles from "./switch.module.css";

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "role" | "className" | "children"> {
  /** The sentence beside the switch: it names the checkbox. */
  label: ReactNode;
  /** A second, quieter line, read as the description of the checkbox. */
  hint?: ReactNode;
  className?: string;
}

/**
 * Figma « Interrupteur ». Underneath it is a real checkbox announced as a switch: `checked`,
 * `defaultChecked`, `onChange`, `name`, `disabled` and `required` are the input's own.
 */
export function Switch({ label, hint, className, id, ...input }: SwitchProps) {
  const auto = useId();
  const inputId = id ?? auto;
  const hintId = hint !== undefined ? `${inputId}-hint` : undefined;
  return (
    <label className={cx(styles.wrap, className)} htmlFor={inputId}>
      <span className={styles.control}>
        <input {...input} id={inputId} type="checkbox" role="switch" className={styles.input} aria-describedby={cx(input["aria-describedby"], hintId) || undefined} />
        <span className={styles.track} aria-hidden="true" />
      </span>
      <span className={styles.text}>
        <span className={styles.label}>{label}</span>
        {hint !== undefined && (
          <span id={hintId} className={styles.hint}>
            {hint}
          </span>
        )}
      </span>
    </label>
  );
}
