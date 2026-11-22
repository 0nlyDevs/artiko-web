import Link from "next/link";
import type { ReactNode } from "react";
import { cx } from "./cx";
import styles from "./cartel.module.css";

export interface CartelProps {
  /** The small wine line on top: « 01 / 12 », « Lauréat · novembre 2026 ». */
  eyebrow?: ReactNode;
  title: ReactNode;
  /** Lines under the title, one child per line: category, artist. Only fields the API gives. */
  children?: ReactNode;
  /** The closing wine line: « Lire la notice », « 23 votes ». */
  footer?: ReactNode;
  /** `wall`: the small label hung beside a work. `honour`: the wide, centred label of the laureate. */
  variant?: "wall" | "honour";
  /** Makes the whole cartel a link, for example to the notice of the work. */
  href?: string;
  className?: string;
}

/** Figma « Cartel »: the paper label with a brass edge that names a work on a wall. */
export function Cartel({ eyebrow, title, children, footer, variant = "wall", href, className }: CartelProps) {
  const classes = cx(styles.cartel, variant === "honour" && styles.honour, className);
  const content = (
    <>
      {eyebrow !== undefined && <span className={styles.eyebrow}>{eyebrow}</span>}
      <span className={styles.title}>{title}</span>
      {children !== undefined && <span className={styles.lines}>{children}</span>}
      {footer !== undefined && <span className={styles.footer}>{footer}</span>}
    </>
  );
  return href !== undefined ? (
    <Link href={href} className={classes}>
      {content}
    </Link>
  ) : (
    <div className={classes}>{content}</div>
  );
}
