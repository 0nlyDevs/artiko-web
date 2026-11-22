import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';
import styles from './StatusBanner.module.css';

export type BannerTone = 'info' | 'error' | 'success' | 'warning';

export interface StatusBannerProps {
  tone?: BannerTone | undefined;
  children: ReactNode;
  /** Support reference shown under the message. */
  requestId?: string | null | undefined;
  action?: { label: string; onClick: () => void } | undefined;
  className?: string | undefined;
}

/** Figma "Messages système": a quiet band with an optional recovery action. */
export function StatusBanner({
  tone = 'info',
  children,
  requestId,
  action,
  className,
}: StatusBannerProps) {
  return (
    <div
      className={cx(styles.banner, tone !== 'info' && styles[tone], className)}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      <div className={styles.body}>
        {children}
        {requestId !== undefined && requestId !== null && requestId !== '' && (
          <span className={styles.requestId}>Référence : {requestId}</span>
        )}
      </div>
      {action !== undefined && (
        <button
          type="button"
          className={styles.action}
          onClick={action.onClick}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
