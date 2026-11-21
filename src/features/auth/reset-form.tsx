"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import type { Key } from "@/i18n/en";
import { useT } from "@/i18n/locale";
import { authClient } from "@/lib/auth-client";
import { MIN_PASSWORD_LENGTH, passwordProblems } from "@/lib/password";
import { authErrorKey } from "@/features/auth/errors";
import { Notice, PasswordField, useToggle } from "@/features/auth/fields";

/** Lands from the emailed link with `?token=` (or `?error=INVALID_TOKEN` when it expired). Every session ends on success. */
export function ResetForm() {
  const { t } = useT();
  const params = useSearchParams();
  const token = params.get("token");
  const [shown, toggle] = useToggle();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<Key | null>(null);
  const problems = passwordProblems(password, confirm);

  async function submit() {
    if (!token) return;
    setBusy(true);
    setError(null);
    const { error } = await authClient.resetPassword({ newPassword: password, token });
    setBusy(false);
    if (error) setError(authErrorKey(error));
    else setDone(true);
  }

  return (
    <div className="rise flex flex-col gap-7">
      <h1 className="text-[40px] leading-none font-extrabold tracking-[-0.04em]">{t("auth.resetTitle")}</h1>
      {done ? (
        <>
          <Notice tone="info">{t("auth.resetDone")}</Notice>
          <Link href="/sign-in" className="btn btn-ink min-h-[52px] font-bold">
            {t("auth.signInSubmit")}
          </Link>
        </>
      ) : !token ? (
        <>
          <Notice>{t("auth.linkInvalid")}</Notice>
          <Link href="/forgot-password" className="btn btn-ink min-h-[52px] font-bold">
            {t("auth.newLink")}
          </Link>
        </>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!problems.tooShort && !problems.mismatch) void submit();
          }}
          className="flex flex-col gap-5"
        >
          <PasswordField
            id="password"
            label={t("auth.newPassword")}
            shown={shown}
            onToggle={toggle}
            required
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
            aria-describedby="reset-help"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <PasswordField
            id="confirm"
            label={t("auth.confirmPassword")}
            shown={shown}
            onToggle={toggle}
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          <p id="reset-help" className="text-sm text-muted">
            {t("auth.passwordHelp", { min: MIN_PASSWORD_LENGTH })} {problems.mismatch && confirm ? t("auth.passwordsDiffer") : ""}
          </p>
          {error && (
            <Notice>
              {t(error)}{" "}
              {error === "auth.linkInvalid" && (
                <Link href="/forgot-password" className="font-semibold underline underline-offset-4">
                  {t("auth.newLink")}
                </Link>
              )}
            </Notice>
          )}
          <button type="submit" disabled={busy || problems.tooShort || problems.mismatch} className="btn btn-ink min-h-[52px] font-bold">
            {busy && <span className="spin" aria-hidden="true" />}
            {t("auth.resetSubmit")}
          </button>
        </form>
      )}
    </div>
  );
}
