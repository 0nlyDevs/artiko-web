"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Key } from "@/i18n/en";
import { useT } from "@/i18n/locale";
import { clearApiToken } from "@/lib/api-token";
import { authClient } from "@/lib/auth-client";
import { authErrorKey } from "@/features/auth/errors";
import { Field, Notice, PasswordField, useToggle } from "@/features/auth/fields";

export function SignInForm() {
  const router = useRouter();
  const { t } = useT();
  const [shown, toggle] = useToggle();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Key | null>(null);
  // Signing in to an unconfirmed account sends a new link (server side); this offers one more.
  const [unverified, setUnverified] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  async function submit(form: FormData) {
    setBusy(true);
    setError(null);
    setUnverified(null);
    const email = String(form.get("email"));
    const { error } = await authClient.signIn.email({ email, password: String(form.get("password")), callbackURL: "/me" });
    setBusy(false);
    if (error?.code === "EMAIL_NOT_VERIFIED") return setUnverified(email);
    if (error) return setError(authErrorKey(error));
    // A token cached for a previous account must never be sent as this one.
    clearApiToken();
    router.push("/me");
  }

  async function resend() {
    if (!unverified) return;
    const { error } = await authClient.sendVerificationEmail({ email: unverified, callbackURL: "/me" });
    if (error) setError(authErrorKey(error));
    else setResent(true);
  }

  return (
    <div className="rise flex flex-col gap-7">
      <div>
        <h1 className="text-[40px] leading-none font-extrabold tracking-[-0.04em]">{t("auth.signInTitle")}</h1>
        <p className="mt-3 leading-relaxed text-muted">{t("auth.signInLead")}</p>
      </div>
      <form
        onSubmit={(event) => {
          // Not `action={...}`: React resets the fields after an action even when it fails, wiping what was typed.
          event.preventDefault();
          void submit(new FormData(event.currentTarget));
        }}
        className="flex flex-col gap-5"
      >
        <Field id="email" label={t("auth.email")} type="email" required autoComplete="email" inputMode="email" />
        <div className="flex flex-col gap-2">
          <PasswordField id="password" label={t("auth.password")} shown={shown} onToggle={toggle} required autoComplete="current-password" />
          <Link href="/forgot-password" className="self-end text-sm text-muted underline underline-offset-4 hover:text-ink">
            {t("auth.forgot")}
          </Link>
        </div>
        {error && <Notice>{t(error)}</Notice>}
        {unverified && (
          <Notice tone="info">
            <p>{t("auth.notVerifiedSent", { email: unverified })}</p>
            {resent ? (
              <p className="mt-2 font-semibold">{t("auth.resent")}</p>
            ) : (
              <button type="button" onClick={resend} className="mt-2 font-semibold underline underline-offset-4">
                {t("auth.resend")}
              </button>
            )}
          </Notice>
        )}
        <button type="submit" disabled={busy} className="btn btn-ink mt-1 min-h-[52px] font-bold">
          {busy && <span className="spin" aria-hidden="true" />}
          {busy ? t("auth.signingIn") : t("auth.signInSubmit")}
        </button>
      </form>
    </div>
  );
}
