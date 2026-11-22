"use client";

import { useT } from "@/i18n/locale";
import { Button } from "@/lib/ui/kanto";
import { Actions, Notice } from "@/features/auth/fields";
import styles from "./account.module.css";

/** What an account page shows when it fails to render: a sentence about this page, and a way to try again. */
export function AccountError({ retry }: { retry: () => void }) {
  const { t } = useT();
  return (
    <div className={styles.panel}>
      <div className={styles.head}>
        <h1 className={styles.title}>{t("account.errorTitle")}</h1>
      </div>
      <Notice>{t("account.errorText")}</Notice>
      <Actions>
        <Button onClick={() => retry()}>{t("error.retry")}</Button>
      </Actions>
    </div>
  );
}
