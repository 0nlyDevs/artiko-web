import Link from "next/link";
import type { ReactNode } from "react";
import { cx } from "./cx";
import styles from "./category-chip.module.css";

type Common = {
  children: ReactNode;
  /** Draws the selected state. A radio chip without `onChange` takes it as its starting state. */
  selected?: boolean;
  className?: string;
};

/** A filter link: the selected one is the current page. */
type LinkChip = Common & { href: string; scroll?: boolean; name?: never; onClick?: never };
/** A choice in a form: a real radio button, sent with the form under `name`. */
type RadioChip = Common & { name: string; value: string; onChange?: (value: string) => void; required?: boolean; disabled?: boolean; href?: never; onClick?: never };
/** A toggle: a button that says whether it is pressed. */
type ButtonChip = Common & { onClick: () => void; disabled?: boolean; href?: never; name?: never };
/** A label only. */
type StaticChip = Common & { href?: never; name?: never; onClick?: never };

export type CategoryChipProps = LinkChip | RadioChip | ButtonChip | StaticChip;

/** Figma « Puce catégorie »: an art form in the italic serif, framed in ink with a wine dot when selected. */
export function CategoryChip(props: CategoryChipProps) {
  const { children, selected = false, className } = props;
  if (props.href !== undefined) {
    return (
      <Link href={props.href} scroll={props.scroll} aria-current={selected ? "page" : undefined} className={cx(styles.chip, selected && styles.selected, className)}>
        {children}
      </Link>
    );
  }
  if (props.name !== undefined) {
    const { name, value, onChange, required, disabled } = props;
    return (
      <label className={cx(styles.chip, disabled && styles.disabled, className)}>
        <input
          className={styles.input}
          type="radio"
          name={name}
          value={value}
          required={required}
          disabled={disabled}
          {...(onChange ? { checked: selected, onChange: () => onChange(value) } : { defaultChecked: selected })}
        />
        {children}
      </label>
    );
  }
  if (props.onClick !== undefined) {
    return (
      <button type="button" onClick={props.onClick} disabled={props.disabled} aria-pressed={selected} className={cx(styles.chip, selected && styles.selected, props.disabled && styles.disabled, className)}>
        {children}
      </button>
    );
  }
  return <span className={cx(styles.chip, styles.static, selected && styles.selected, className)}>{children}</span>;
}

export interface CategoryChipGroupProps {
  children: ReactNode;
  /** Name of the group for assistive technology. With it, the chips are announced as one set of choices. */
  label?: string;
  labelledBy?: string;
  /** `radiogroup` for radio chips, `group` for toggles; leave empty inside a <nav> of link chips. */
  role?: "radiogroup" | "group";
  className?: string;
}

/** The chips on one or more lines, 8 px apart. */
export function CategoryChipGroup({ children, label, labelledBy, role, className }: CategoryChipGroupProps) {
  return (
    <div role={role} aria-label={label} aria-labelledby={labelledBy} className={cx(styles.group, className)}>
      {children}
    </div>
  );
}
