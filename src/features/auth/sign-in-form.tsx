"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import type { Key } from "@/i18n/en";
import { useT } from "@/i18n/locale";
import { clearApiToken } from "@/lib/api-token";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/lib/ui/kanto";
import { authErrorKey } from "@/features/auth/errors";
import { Actions, CancelLink, Field, FieldRow, FormError, Notice, PasswordField, QuietLink, Section, useToggle } from "@/features/auth/fields";
import { takePublishIntent } from "@/features/auth/publish-intent";
import { useRetryAfter } from "@/features/auth/retry-after";
import { destinationAfterSignIn, RETURN_PARAM } from "@/features/auth/return-to";
import { SignedInNotice } from "@/features/auth/signed-in-notice";
import { MY_SPACE_VERIFIED_CALLBACK_URL, resendVerification, verificationNotice } from "@/features/auth/verification";
import { VerificationNotice } from "@/features/auth/verification-notice";
import styles from "./account.module.css";

export function SignInForm() {
  const { t } = useT();
  const [shown, toggle] = useToggle();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Key | null>(null);
  // Signing in to an unconfirmed account sends a new link (server side); this offers one more.
  const [unverified, setUnverified] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const wait = useRetryAfter();

  // The button stays busy while the next page loads. Coming back with the browser's Back button can
  // restore this page as it was left: the form must be usable again.
  useEffect(() => {
    const restored = (event: PageTransitionEvent) => {
      if (event.persisted) setBusy(false);
    };
    window.addEventListener("pageshow", restored);
    return () => window.removeEventListener("pageshow", restored);
  }, []);

  async function submit(form: FormData) {
    setBusy(true);
    setError(null);
    setUnverified(null);
    setResent(false);
    const email = String(form.get("email"));
    try {
      const { error } = await authClient.signIn.email({ email, password: String(form.get("password")), fetchOptions: wait.fetchOptions, callbackURL: MY_SPACE_VERIFIED_CALLBACK_URL });
      if (!error) {
        // A token cached for a previous account must never be sent as this one.
        clearApiToken();
        // Back to the page the person came from (`?next=`), else my space: on the artist profile when the
        // sign-up switch asked for it. Better Auth's client starts its own move to the callback address on
        // success; this one comes after it and replaces it. The button stays busy until the page changes.
        const next = new URLSearchParams(window.location.search).get(RETURN_PARAM);
        window.location.assign(destinationAfterSignIn(next, () => takePublishIntent(email)));
        return;
      }
      if (error.code === "EMAIL_NOT_VERIFIED") setUnverified(email);
      else setError(authErrorKey(error));
    } catch {
      // The request never reached the server: the form stays usable.
      setError("auth.unexpected");
    }
    setBusy(false);
  }

  async function resend() {
    if (!unverified) return;
    try {
      const { error } = await resendVerification(unverified, wait.fetchOptions);
      if (error) setError(authErrorKey(error));
      else setResent(true);
    } catch {
      setError("auth.unexpected");
    }
  }

  return (
    <div className={`rise ${styles.panel}`}>
      <div className={styles.head}>
        {/* The open tab already writes « Se connecter » above. */}
        <h1 className="visually-hidden">{t("auth.signInTitle")}</h1>
        <p className={styles.lead}>{t("auth.signInLead")}</p>
      </div>
      {!busy && <SignedInNotice />}
      {/* Reads the query string, so only this notice waits for the browser; the form stays prerendered. */}
      <Suspense>
        <VerificationLanding />
      </Suspense>
      <form
        onSubmit={(event) => {
          // Not `action={...}`: React resets the fields after an action even when it fails, wiping what was typed.
          event.preventDefault();
          if (!wait.waiting) void submit(new FormData(event.currentTarget));
        }}
        className={styles.fields}
      >
        <Section title={t("account.sectionAccount")}>
          <FieldRow>
            <Field id="email" label={t("auth.email")} type="email" required autoComplete="email" inputMode="email" />
            <PasswordField id="password" label={t("auth.password")} shown={shown} onToggle={toggle} required autoComplete="current-password" />
          </FieldRow>
        </Section>
        <FormError error={error} wait={wait} />
        {unverified && (
          <Notice tone="info">
            {t("auth.notVerifiedSent", { email: unverified })}
            {resent ? (
              <strong className={styles.noticeLine}>{t("auth.resent")}</strong>
            ) : (
              <span className={styles.noticeLine}>
                <button type="button" onClick={resend} className={styles.noticeAction}>
                  {t("auth.resend")}
                </button>
              </span>
            )}
          </Notice>
        )}
        <Actions note={<QuietLink href="/forgot-password">{t("auth.forgot")}</QuietLink>}>
          <CancelLink />
          <Button type="submit" withArrow loading={busy} disabled={wait.waiting}>
            {busy ? t("auth.signingIn") : t("auth.signInSubmit")}
          </Button>
        </Actions>
      </form>
    </div>
  );
}

/** Where a verification link lands: `?verified=1`, with `error=` when the link no longer works. */
function VerificationLanding() {
  const notice = verificationNotice(useSearchParams());
  return notice && <VerificationNotice notice={notice} />;
}
