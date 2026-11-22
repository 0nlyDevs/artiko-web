import { isMockApi } from '../../lib/api';
import { cx } from '../../lib/cx';
import styles from './DemoBadge.module.css';

export interface DemoBadgeProps {
  /** Shown even on the gateway, for content that is demonstration content. */
  always?: boolean | undefined;
  label?: string | undefined;
  theme?: 'light' | 'dark' | undefined;
  className?: string | undefined;
}

/**
 * Marks data that comes from the in-browser mock or from demo fixtures, so a
 * screen never passes a simulated result for a real one.
 */
export function DemoBadge({
  always = false,
  label = 'Données de démonstration',
  theme = 'light',
  className,
}: DemoBadgeProps) {
  if (!always && !isMockApi) {
    return null;
  }
  return (
    <span
      className={cx(styles.badge, theme === 'dark' && styles.dark, className)}
    >
      <span className={styles.dot} aria-hidden="true" />
      {label}
    </span>
  );
}
