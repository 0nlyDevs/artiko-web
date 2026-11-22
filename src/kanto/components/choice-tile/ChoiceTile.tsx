import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';
import styles from './ChoiceTile.module.css';

export interface ChoiceOption<T extends string> {
  value: T;
  title: string;
  description?: string | undefined;
  disabled?: boolean | undefined;
}

export interface ChoiceTilesProps<T extends string> {
  name: string;
  label: ReactNode;
  options: readonly ChoiceOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  columns?: 1 | 2 | 3 | undefined;
  /** `tile` is the art-form tile; `row` is the single-line choice of step 3. */
  layout?: 'tile' | 'row' | undefined;
  error?: string | undefined;
  className?: string | undefined;
}

/** Figma "Tuiles de choix": a radio group drawn as cards. */
export function ChoiceTiles<T extends string>({
  name,
  label,
  options,
  value,
  onChange,
  columns = 2,
  layout = 'tile',
  error,
  className,
}: ChoiceTilesProps<T>) {
  const groupClass = cx(
    styles.group,
    columns === 2 && layout === 'tile' && styles.columns2,
    columns === 3 && layout === 'tile' && styles.columns3,
    className,
  );
  return (
    <fieldset
      className={groupClass}
      aria-invalid={error !== undefined || undefined}
    >
      <legend className="visually-hidden">{label}</legend>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <label
            key={option.value}
            className={cx(
              styles.tile,
              layout === 'row' && styles.row,
              selected && styles.selected,
              error !== undefined && !selected && styles.invalid,
            )}
          >
            <input
              className={styles.input}
              type="radio"
              name={name}
              value={option.value}
              checked={selected}
              disabled={option.disabled}
              onChange={() => {
                onChange(option.value);
              }}
            />
            <span className={styles.text}>
              <span className={styles.title}>{option.title}</span>
              {option.description !== undefined && (
                <span className={styles.description}>{option.description}</span>
              )}
            </span>
            <span className={styles.radio} aria-hidden="true" />
          </label>
        );
      })}
    </fieldset>
  );
}
