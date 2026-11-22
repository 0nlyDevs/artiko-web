import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import styles from "@/kanto/components/button-link/ButtonLink.module.css";
import { IconForward } from "@/lib/ui/icons";
import { cx } from "./cx";

export interface ButtonLinkProps extends Omit<ComponentProps<typeof Link>, "className" | "children"> {
  /** `primary`: ink fill. `secondary`: ink outline. */
  variant?: "primary" | "secondary";
  withArrow?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * The KANTO button as a link of the app: the same drawing as `ButtonLink` of src/kanto, on next/link,
 * because the KANTO one moves with the museum's own router and only works inside it.
 */
export function ButtonLink({ variant = "primary", withArrow = false, className, children, ...link }: ButtonLinkProps) {
  return (
    <Link {...link} className={cx(styles.button, styles[variant], className)}>
      <span>{children}</span>
      {withArrow && (
        <span className={styles.arrow} aria-hidden="true">
          <IconForward size={16} />
        </span>
      )}
    </Link>
  );
}
