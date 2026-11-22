"use client";

import { useState } from "react";
import type { Key } from "@/i18n/en";
import { useT } from "@/i18n/locale";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/lib/ui/kanto";
import { authErrorKey } from "@/features/auth/errors";
import { Actions, Field, FieldRow, FormError, Notice, QuietLink } from "@/features/auth/fields";
import { useRetryAfter } from "@/features/auth/retry-after";
import styles from "./account.module.css";

/** Asks for a reset link. The answer never says whether the address has an account. */
export function ForgotForm() {
  const { t } = useT();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<Key | null>(null);
  const wait = useRetryAfter();

  async function submit(form: FormData) {
    setBusy(true);
    setError(null);
    const email = String(form.get("email")).trim();
    try {
      const { error } = await authClient.requestPasswordReset({ email, redirectTo: "/reset-password", fetchOptions: wait.fetchOptions });
      if (error) setError(authErrorKey(error));
      else setSent(email);
    } catch {
      // The request never reached the server: the form stays usable.
      setError("auth.unexpected");
    }
    setBusy(false);
  }

  return (
    <div className={`rise ${styles.panel}`}>
      <div className={styles.head}>
        <h1 className={styles.title}>{t("auth.forgotTitle")}</h1>
        <p className={styles.lead}>{t("auth.forgotLead")}</p>
      </div>
      {sent ? (
        <>
          <Notice tone="info">{t("auth.forgotSent", { email: sent })}</Notice>
          <Actions note={<QuietLink href="/sign-in">{t("auth.backToSignIn")}</QuietLink>}>{null}</Actions>
        </>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!wait.waiting) void submit(new FormData(event.currentTarget));
          }}
          className={styles.fields}
        >
          <FieldRow>
            <Field id="email" label={t("auth.email")} type="email" required autoComplete="email" inputMode="email" />
          </FieldRow>
          <FormError error={error} wait={wait} />
          <Actions note={<QuietLink href="/sign-in">{t("auth.backToSignIn")}</QuietLink>}>
            <Button type="submit" withArrow loading={busy} disabled={wait.waiting}>
              {t("auth.sendLink")}
            </Button>
          </Actions>
        </form>
      )}
    </div>
  );
}
