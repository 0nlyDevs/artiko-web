"use client";

import Link from "next/link";
import { useState } from "react";
import type { Key } from "@/i18n/en";
import { useT } from "@/i18n/locale";
import { authClient } from "@/lib/auth-client";
import { authErrorKey } from "@/features/auth/errors";
import { Field, Notice } from "@/features/auth/fields";

/** Asks for a reset link. The answer never says whether the address has an account. */
export function ForgotForm() {
  const { t } = useT();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<Key | null>(null);

  async function submit(form: FormData) {
    setBusy(true);
    setError(null);
    const email = String(form.get("email")).trim();
    const { error } = await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" });
    setBusy(false);
    if (error) setError(authErrorKey(error));
    else setSent(email);
  }

  return (
    <div className="rise flex flex-col gap-7">
      <div>
        <h1 className="text-[40px] leading-none font-extrabold tracking-[-0.04em]">{t("auth.forgotTitle")}</h1>
        <p className="mt-3 leading-relaxed text-muted">{t("auth.forgotLead")}</p>
      </div>
      {sent ? (
        <Notice tone="info">{t("auth.forgotSent", { email: sent })}</Notice>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit(new FormData(event.currentTarget));
          }}
          className="flex flex-col gap-5"
        >
          <Field id="email" label={t("auth.email")} type="email" required autoComplete="email" inputMode="email" />
          {error && <Notice>{t(error)}</Notice>}
          <button type="submit" disabled={busy} className="btn btn-ink min-h-[52px] font-bold">
            {busy && <span className="spin" aria-hidden="true" />}
            {t("auth.sendLink")}
          </button>
        </form>
      )}
      <Link href="/sign-in" className="text-sm text-muted underline underline-offset-4 hover:text-ink">
        {t("auth.backToSignIn")}
      </Link>
    </div>
  );
}
