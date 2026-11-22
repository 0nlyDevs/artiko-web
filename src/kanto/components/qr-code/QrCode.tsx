import qrcode from 'qrcode-generator';
import { useMemo } from 'react';
import { cx } from '../../lib/cx';
import styles from './QrCode.module.css';

export interface QrCodeProps {
  /** Text encoded in the code, for example the pairing URL. */
  value: string;
  /** Rendered size in CSS pixels. */
  size?: number | undefined;
  /** Accessible name of the image. */
  label: string;
  className?: string | undefined;
}

const QUIET_ZONE = 4;

/** Builds one SVG path covering every dark module, with a four-module quiet zone. */
export function qrPath(value: string): { path: string; modules: number } {
  const qr = qrcode(0, 'M');
  qr.addData(value);
  qr.make();
  const count = qr.getModuleCount();
  const parts: string[] = [];
  for (let row = 0; row < count; row += 1) {
    for (let col = 0; col < count; col += 1) {
      if (qr.isDark(row, col)) {
        parts.push(
          `M${String(col + QUIET_ZONE)} ${String(row + QUIET_ZONE)}h1v1h-1z`,
        );
      }
    }
  }
  return { path: parts.join(''), modules: count + QUIET_ZONE * 2 };
}

/** QR code drawn inline, in the current text colour, so it prints and scans without a request. */
export function QrCode({ value, size = 200, label, className }: QrCodeProps) {
  const { path, modules } = useMemo(() => qrPath(value), [value]);
  return (
    <svg
      className={cx(styles.qr, className)}
      role="img"
      aria-label={label}
      width={size}
      height={size}
      viewBox={`0 0 ${String(modules)} ${String(modules)}`}
      shapeRendering="crispEdges"
    >
      <rect width={modules} height={modules} fill="var(--color-paper)" />
      <path d={path} fill="currentColor" />
    </svg>
  );
}
