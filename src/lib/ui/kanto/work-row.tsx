import Link from "next/link";
import type { ReactNode } from "react";
import { T } from "@/i18n/locale";
import { cx } from "./cx";
import styles from "./work-row.module.css";

export interface WorkRowProps {
  /** The picture of the work (an <img>, next/image or <video>: it covers the 44 x 54 tile) or a pictogram. A paper tile when absent. */
  thumbnail?: ReactNode;
  title: ReactNode;
  /** The quiet line under the title: category, month, contest status, joined by the caller. */
  meta?: ReactNode;
  /** The badge of the work, a <BadgeLabel>. */
  badge?: ReactNode;
  /** A short figure beside the badge, for example the votes. */
  aside?: ReactNode;
  /** Links before « Voir », each a <WorkRowLink>. */
  actions?: ReactNode;
  /** Address of the work: draws the « Voir » link. */
  href?: string;
  /** Text of that link. « Voir » in the active language by default. */
  viewLabel?: ReactNode;
  /** The row is a list item by default: put it in <WorkRows>. */
  as?: "li" | "div";
  className?: string;
}

/** Figma « Ligne œuvre »: one work on one line, closed by a hairline. */
export function WorkRow({ thumbnail, title, meta, badge, aside, actions, href, viewLabel, as: Tag = "li", className }: WorkRowProps) {
  const tail = badge !== undefined || aside !== undefined || actions !== undefined || href !== undefined;
  return (
    <Tag className={cx(styles.row, className)}>
      <span className={styles.thumb}>{thumbnail}</span>
      <span className={styles.body}>
        <span className={styles.title}>{title}</span>
        {meta !== undefined && <span className={styles.meta}>{meta}</span>}
      </span>
      {tail && (
        <span className={styles.tail}>
          {badge !== undefined && <span className={styles.badgeSlot}>{badge}</span>}
          {aside !== undefined && <span className={styles.aside}>{aside}</span>}
          {(actions !== undefined || href !== undefined) && (
            <span className={styles.links}>
              {actions}
              {href !== undefined && (
                <Link href={href} className={styles.link}>
                  {viewLabel ?? <T k="kit.view" />}
                  {/* Every row says « Voir »: the title tells assistive technology which work. */}
                  <span className="visually-hidden">, {title}</span>
                </Link>
              )}
            </span>
          )}
        </span>
      )}
    </Tag>
  );
}

/** A quiet underlined link of a row (« Preuves »), or a button when it acts on the page. */
export function WorkRowLink({ href, onClick, children }: { href?: string; onClick?: () => void; children: ReactNode }) {
  if (href !== undefined) {
    return (
      <Link href={href} className={styles.link}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={styles.link}>
      {children}
    </button>
  );
}

/** The list that holds the rows. */
export function WorkRows({ children, label, labelledBy, className }: { children: ReactNode; label?: string; labelledBy?: string; className?: string }) {
  return (
    <ul aria-label={label} aria-labelledby={labelledBy} className={cx(styles.list, className)}>
      {children}
    </ul>
  );
}
