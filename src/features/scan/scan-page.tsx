import { ScanForm } from "@/features/scan/scan-form";
import { T } from "@/i18n/locale";
import styles from "./scan.module.css";

export function ScanPage() {
  return (
    <div className={styles.page}>
      <header className={styles.lead}>
        <p className={styles.eyebrow}>
          <T k="scan.eyebrow" />
        </p>
        <h1 className={styles.headline}>
          <span>
            <T k="scan.headline1" />
          </span>
          <span className={styles.accent}>
            <T k="scan.headline2" />
          </span>
        </h1>
        <p className={styles.intro}>
          <T k="scan.intro" />
        </p>
      </header>
      <ScanForm />
    </div>
  );
}
