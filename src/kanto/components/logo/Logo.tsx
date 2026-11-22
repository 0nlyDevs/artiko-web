import { cx } from '../../lib/cx';
import styles from './Logo.module.css';

export interface LogoProps {
  className?: string | undefined;
  /** `nav` is the 22 px wordmark of the bars; `display` is the large one of the loading screen. */
  size?: 'nav' | 'display' | undefined;
}

/**
 * KANTO wordmark, set in the display serif of the Figma "Logo" layer so it
 * follows the current text colour and the licensed font when present.
 */
export function Logo({ className, size = 'nav' }: LogoProps) {
  return (
    <span className={cx(styles.wordmark, styles[size], className)}>KANTO</span>
  );
}
