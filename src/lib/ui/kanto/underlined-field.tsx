import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cx } from "./cx";
import styles from "./underlined-field.module.css";

type Base = {
  label: ReactNode;
  /** Help under the field, read as its description. */
  hint?: ReactNode;
  /** `success` turns the hint green, for a rule that is met (« 12 caractères · 10 minimum »). */
  hintTone?: "neutral" | "success";
  /** Replaces the hint, marks the field invalid and is announced when it appears. */
  error?: ReactNode;
  /** A control drawn inside the field on its right, for example the button that shows a password. */
  trailing?: ReactNode;
  className?: string;
};

type InputField = Base & { as?: "input" } & Omit<InputHTMLAttributes<HTMLInputElement>, "className">;
type TextareaField = Base & { as: "textarea" } & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className">;
type SelectField = Base & { as: "select"; children: ReactNode } & Omit<SelectHTMLAttributes<HTMLSelectElement>, "className">;

export type UnderlinedFieldProps = InputField | TextareaField | SelectField;

/**
 * Figma « Champ souligné »: a label, a value on a hairline, then a hint or an error. The control is a
 * plain <input>, <textarea> or <select> and takes its own attributes (`name`, `defaultValue`, `onChange`,
 * `autoComplete`...), so it works in a form read with FormData as well as in a controlled one.
 */
export function UnderlinedField(props: UnderlinedFieldProps) {
  const auto = useId();
  const { label, hint, hintTone = "neutral", error, trailing, className, as, ...control } = props;
  const id = control.id ?? auto;
  const invalid = error !== undefined && error !== null && error !== false && error !== "";
  const hintId = !invalid && hint !== undefined ? `${id}-hint` : undefined;
  const errorId = invalid ? `${id}-error` : undefined;
  const wiring = {
    id,
    className: styles.control,
    "aria-invalid": invalid || control["aria-invalid"] || undefined,
    "aria-describedby": cx(control["aria-describedby"], errorId, hintId) || undefined,
  };
  return (
    <div className={cx(styles.field, invalid && styles.invalid, trailing !== undefined && styles.withTrailing, className)}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <div className={styles.row}>
        {as === "textarea" ? (
          <textarea {...(control as TextareaHTMLAttributes<HTMLTextAreaElement>)} {...wiring} />
        ) : as === "select" ? (
          <select {...(control as SelectHTMLAttributes<HTMLSelectElement>)} {...wiring} />
        ) : (
          <input {...(control as InputHTMLAttributes<HTMLInputElement>)} {...wiring} />
        )}
        {trailing !== undefined && <span className={styles.trailing}>{trailing}</span>}
      </div>
      {(invalid || hint !== undefined) && (
        <div className={styles.meta}>
          {invalid ? (
            <span id={errorId} className={styles.error} role="alert">
              {error}
            </span>
          ) : (
            <span id={hintId} className={cx(styles.hint, hintTone === "success" && styles.success)}>
              {hint}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
