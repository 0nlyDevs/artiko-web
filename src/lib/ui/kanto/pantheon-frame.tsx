import Image from "next/image";
import type { ReactNode } from "react";
import gilded from "@/kanto/assets/gallery/frame-gilded-1200.webp";
import { cx } from "./cx";
import styles from "./pantheon-frame.module.css";

export interface PantheonFrameProps {
  /** The work: an <img>, next/image or <video>, which covers the opening. Leave empty for an empty frame. */
  children?: ReactNode;
  /** Shown in the opening of an empty frame, for example « Aucun vote ce mois-ci ». */
  caption?: ReactNode;
  /** `sizes` of the gilded picture: about 1.4 times the width the frame takes on screen. */
  sizes?: string;
  /** Sets the width: the component is as wide as its box and keeps the proportions of the moulding (422 : 498). */
  className?: string;
}

/** Figma « Cadre du Panthéon »: the gilded frame, filled with a work or empty with a caption. */
export function PantheonFrame({ children, caption, sizes = "(min-width: 768px) 400px, 85vw", className }: PantheonFrameProps) {
  const empty = children === undefined || children === null || children === false;
  return (
    <figure className={cx(styles.frame, empty && styles.empty, className)} data-empty={empty || undefined}>
      <div className={styles.opening}>{empty ? caption !== undefined && <figcaption className={styles.caption}>{caption}</figcaption> : children}</div>
      {/* Decoration only: the work inside carries the text alternative. */}
      <Image className={styles.gilded} src={gilded} sizes={sizes} alt="" />
    </figure>
  );
}
