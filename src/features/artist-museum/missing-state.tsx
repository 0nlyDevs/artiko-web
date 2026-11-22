import type { Key } from "@/i18n/en";
import { T } from "@/i18n/locale";
import { ButtonLink } from "@/lib/ui/kanto";
import styles from "./missing-state.module.css";

/** What an unknown artist or exposition shows in place of the page, with two ways back into the museum. */
export function MissingState({ title }: { title: Key }) {
  return (
    <div className={styles.missing}>
      <p className={styles.eyebrow}>
        <T k="missing.eyebrow" />
      </p>
      <h1 className={styles.title}>
        <T k={title} />
      </h1>
      <p className={styles.text}>
        <T k="missing.text" />
      </p>
      <div className={styles.actions}>
        <ButtonLink href="/explore" className={styles.action}>
          <T k="missing.artists" />
        </ButtonLink>
        <ButtonLink href="/" variant="secondary" className={styles.action}>
          <T k="missing.home" />
        </ButtonLink>
      </div>
    </div>
  );
}
