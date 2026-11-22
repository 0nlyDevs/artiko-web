import type {
  ChangeEvent,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { useId } from 'react';
import { cx } from '../../lib/cx';
import styles from './TextField.module.css';

interface BaseProps {
  label: string;
  hint?: ReactNode | undefined;
  error?: string | undefined;
  className?: string | undefined;
  /** Shows "n / max" under the field. */
  maxLength?: number | undefined;
}

export interface TextFieldProps
  extends
    BaseProps,
    Omit<
      InputHTMLAttributes<HTMLInputElement>,
      'className' | 'maxLength' | 'onChange'
    > {
  multiline?: false | undefined;
  onChange?: ((value: string) => void) | undefined;
}

export interface TextAreaFieldProps
  extends
    BaseProps,
    Omit<
      TextareaHTMLAttributes<HTMLTextAreaElement>,
      'className' | 'maxLength' | 'onChange'
    > {
  multiline: true;
  onChange?: ((value: string) => void) | undefined;
}

function Meta({
  id,
  hint,
  error,
  length,
  maxLength,
}: {
  id: string;
  hint: ReactNode | undefined;
  error: string | undefined;
  length: number | null;
  maxLength: number | undefined;
}) {
  if (error === undefined && hint === undefined && maxLength === undefined) {
    return null;
  }
  return (
    <div className={styles.meta}>
      {error !== undefined ? (
        <span id={`${id}-error`} className={styles.error} role="alert">
          {error}
        </span>
      ) : (
        hint !== undefined && (
          <span id={`${id}-hint`} className={styles.hint}>
            {hint}
          </span>
        )
      )}
      {maxLength !== undefined && length !== null && (
        <span className={cx(styles.hint, styles.counter)}>
          {length} / {maxLength}
        </span>
      )}
    </div>
  );
}

/** The props without the variant switch, which is not an HTML attribute. */
function withoutVariant<P extends { multiline?: boolean | undefined }>(
  props: P,
): Omit<P, 'multiline'> {
  const rest = { ...props };
  delete rest.multiline;
  return rest;
}

/** Figma "Champs de saisie": underline text field, with hint, error and counter. */
export function TextField(props: TextFieldProps | TextAreaFieldProps) {
  const id = useId();
  const { label, hint, error, className, maxLength } = props;
  const described = cx(
    error !== undefined && `${id}-error`,
    error === undefined && hint !== undefined && `${id}-hint`,
  );
  const value = typeof props.value === 'string' ? props.value : null;

  if (props.multiline === true) {
    const { onChange, ...rest } = withoutVariant(props);
    return (
      <div
        className={cx(
          styles.field,
          error !== undefined && styles.invalid,
          className,
        )}
      >
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
        <textarea
          {...rest}
          id={id}
          className={styles.control}
          maxLength={maxLength}
          aria-invalid={error !== undefined || undefined}
          aria-describedby={described === '' ? undefined : described}
          onChange={(event: ChangeEvent<HTMLTextAreaElement>) => {
            onChange?.(event.target.value);
          }}
        />
        <Meta
          id={id}
          hint={hint}
          error={error}
          length={value?.length ?? null}
          maxLength={maxLength}
        />
      </div>
    );
  }

  const { onChange, ...rest } = withoutVariant(props);
  return (
    <div
      className={cx(
        styles.field,
        error !== undefined && styles.invalid,
        className,
      )}
    >
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <input
        {...rest}
        id={id}
        className={styles.control}
        maxLength={maxLength}
        aria-invalid={error !== undefined || undefined}
        aria-describedby={described === '' ? undefined : described}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          onChange?.(event.target.value);
        }}
      />
      <Meta
        id={id}
        hint={hint}
        error={error}
        length={value?.length ?? null}
        maxLength={maxLength}
      />
    </div>
  );
}

export interface SelectFieldProps
  extends
    BaseProps,
    Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className' | 'onChange'> {
  options: readonly { value: string; label: string }[];
  placeholder?: string | undefined;
  onChange?: ((value: string) => void) | undefined;
}

export function SelectField({
  label,
  hint,
  error,
  className,
  options,
  placeholder,
  onChange,
  ...rest
}: SelectFieldProps) {
  const id = useId();
  return (
    <div
      className={cx(
        styles.field,
        error !== undefined && styles.invalid,
        className,
      )}
    >
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <select
        {...rest}
        id={id}
        className={styles.control}
        aria-invalid={error !== undefined || undefined}
        onChange={(event) => {
          onChange?.(event.target.value);
        }}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <Meta
        id={id}
        hint={hint}
        error={error}
        length={null}
        maxLength={undefined}
      />
    </div>
  );
}
