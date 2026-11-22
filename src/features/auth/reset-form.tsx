"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import type { Key } from "@/i18n/en";
import { useT } from "@/i18n/locale";
import { authClient } from "@/lib/auth-client";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH, passwordProblems } from "@/lib/password";
import { Button, ButtonLink } from "@/lib/ui/kanto";
import { authErrorKey } from "@/features/auth/errors";
import { Actions, FieldRow, FormError, Met, Notice, PasswordField, useToggle } from "@/features/auth/fields";
import { useRetryAfter } from "@/features/auth/retry-after";
import styles from "./account.module.css";

/** Lands from the emailed link with `?token=` (or `?error=INVALID_TOKEN` when it expired). Every session ends on success. */
export function ResetForm() {
  const { t, plural } = useT();
  const params = useSearchParams();
  const token = params.get("token");
  const [shown, toggle] = useToggle();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<Key | null>(null);
  const wait = useRetryAfter();
  const problems = passwordProblems(password, confirm);
  const blocked = problems.tooShort || problems.tooLong || problems.mismatch;

  async function submit() {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const { error } = await authClient.resetPassword({ newPassword: password, token, fetchOptions: wait.fetchOptions });
      if (error) setError(authErrorKey(error));
      else setDone(true);
    } catch {
      // The request never reached the server: the form stays usable.
      setError("auth.unexpected");
    }
    setBusy(false);
  }

  return (
    <div className={`rise ${styles.panel}`}>
      <div className={styles.head}>
        <h1 className={styles.title}>{t("auth.resetTitle")}</h1>
      </div>
      {done ? (
        <>
          <Notice tone="success">{t("auth.resetDone")}</Notice>
          <Actions>
            <ButtonLink href="/sign-in" withArrow>
              {t("auth.signInSubmit")}
            </ButtonLink>
          </Actions>
        </>
      ) : !token ? (
        <>
          <Notice>{t("auth.linkInvalid")}</Notice>
          <Actions>
            <ButtonLink href="/forgot-password" withArrow>
              {t("auth.newLink")}
            </ButtonLink>
          </Actions>
        </>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!blocked && !wait.waiting) void submit();
          }}
          className={styles.fields}
        >
          <FieldRow>
              <PasswordField
                id="password"
                label={t("auth.newPassword")}
                shown={shown}
                onToggle={toggle}
                required
                minLength={MIN_PASSWORD_LENGTH}
                maxLength={MAX_PASSWORD_LENGTH}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={problems.tooLong ? t("auth.tooLong") : undefined}
                hintTone={problems.tooShort ? "neutral" : "success"}
                hint={
                  !password ? (
                    t("auth.passwordHelp", { min: MIN_PASSWORD_LENGTH })
                  ) : problems.tooShort ? (
                    plural("account.passwordCount", password.length, { min: MIN_PASSWORD_LENGTH })
                  ) : (
                    <Met>{plural("account.passwordCount", password.length, { min: MIN_PASSWORD_LENGTH })}</Met>
                  )
                }
              />
              <PasswordField
                id="confirm"
                label={t("auth.confirmPassword")}
                shown={shown}
                onToggle={toggle}
                required
                maxLength={MAX_PASSWORD_LENGTH}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                hintTone={problems.mismatch ? "neutral" : "success"}
                hint={!problems.mismatch ? <Met>{t("auth.passwordsMatch")}</Met> : confirm ? t("auth.passwordsDiffer") : t("auth.passwordsMatch")}
              />
          </FieldRow>
          <FormError error={error} wait={wait}>
            {error === "auth.linkInvalid" && (
              <>
                {" "}
                <Link href="/forgot-password" className={styles.noticeAction}>
                  {t("auth.newLink")}
                </Link>
              </>
            )}
          </FormError>
          <Actions>
            <Button type="submit" withArrow loading={busy} disabled={blocked || wait.waiting}>
              {t("auth.resetSubmit")}
            </Button>
          </Actions>
        </form>
      )}
    </div>
  );
}
