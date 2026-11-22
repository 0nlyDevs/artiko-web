import type { ButtonHTMLAttributes, ReactNode } from 'react';
import arrowRightAsset from '../../assets/icons/arrow-right-paper.svg';
import { cx } from '../../lib/cx';
import styles from './Button.module.css';

// Next imports an image as { src, width, height }: the markup needs its URL.
const arrowRight = arrowRightAsset.src;

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export interface ButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'type'
> {
  variant?: ButtonVariant | undefined;
  size?: 'regular' | 'small' | undefined;
  type?: 'button' | 'submit' | undefined;
  withArrow?: boolean | undefined;
  /** Shows a spinner, disables the button and keeps its width. */
  loading?: boolean | undefined;
  children: ReactNode;
}

/** Figma "Boutons du hall" as a real button, for forms and actions that do not navigate. */
export function Button({
  variant = 'primary',
  size = 'regular',
  type = 'button',
  withArrow = false,
  loading = false,
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      className={cx(
        styles.button,
        styles[variant],
        size === 'small' && styles.small,
        className,
      )}
      disabled={disabled === true || loading}
      aria-busy={loading || undefined}
    >
      <span>{children}</span>
      {loading ? (
        <span className={styles.spinner} aria-hidden="true" />
      ) : (
        withArrow && (
          <img
            className={styles.arrow}
            src={arrowRight}
            width={16}
            height={16}
            alt=""
          />
        )
      )}
    </button>
  );
}
