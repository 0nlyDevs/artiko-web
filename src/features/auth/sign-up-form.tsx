"use client";

import { useEffect, useRef, useState } from "react";
import type { Key } from "@/i18n/en";
import { useT } from "@/i18n/locale";
import { authClient } from "@/lib/auth-client";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH, passwordProblems, passwordStrength } from "@/lib/password";
import { IconBack, IconMail } from "@/lib/ui/icons";
import { Button, Switch } from "@/lib/ui/kanto";
import { useAuthScene } from "@/features/auth/auth-doors";
import { authErrorKey } from "@/features/auth/errors";
import { Actions, CancelLink, Field, FieldRow, FormError, Met, Notice, PasswordField, Section, useToggle } from "@/features/auth/fields";
import { forgetPublishIntent, rememberPublishIntent } from "@/features/auth/publish-intent";
import { useRetryAfter } from "@/features/auth/retry-after";
import { SignedInNotice } from "@/features/auth/signed-in-notice";
import { resendVerification, VERIFIED_CALLBACK_URL } from "@/features/auth/verification";
import styles from "./account.module.css";

const METER: readonly (Key | null)[] = [null, "auth.weak", "auth.fair", "auth.strong"];

/**
 * Two steps: who you are (name, email, and whether you also want to publish), then a password. The
 * account is created only at the end; it stays closed until the link sent to the address is opened.
 */
export function SignUpForm() {
  const { t, plural } = useT();
  const setScene = useAuthScene();
  const [step, setStep] = useState<1 | 2 | "sent">(1);
  const [who, setWho] = useState({ name: "", email: "" });
  // The switch of the frame. No session exists before the address is confirmed, so the artist profile
  // cannot be created here: the wish is kept in the browser and opens the profile at the first sign-in.
  const [publish, setPublish] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [shown, toggle] = useToggle();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Key | null>(null);
  const [resent, setResent] = useState(false);
  const wait = useRetryAfter();
  const heading = useRef<HTMLHeadingElement>(null);

  // The password step has its own video; leaving the page restores the default.
  useEffect(() => {
    setScene(step === 1 ? null : "palette");
    heading.current?.focus();
  }, [step, setScene]);
  useEffect(() => () => setScene(null), [setScene]);

  const problems = passwordProblems(password, confirm);
  const ready = !problems.tooShort && !problems.tooLong && !problems.mismatch;
  const strength = passwordStrength(password);
  const meter = METER[strength];
  const count = plural("account.passwordCount", password.length, { min: MIN_PASSWORD_LENGTH });

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const { error } = await authClient.signUp.email({ ...who, password, fetchOptions: wait.fetchOptions, callbackURL: VERIFIED_CALLBACK_URL });
      if (error) setError(authErrorKey(error));
      else {
        if (publish) rememberPublishIntent(who.email);
        else forgetPublishIntent();
        setStep("sent");
      }
    } catch {
      // The request never reached the server: the form stays usable.
      setError("auth.unexpected");
    }
    setBusy(false);
  }

  async function resend() {
    try {
      const { error } = await resendVerification(who.email, wait.fetchOptions);
      if (error) setError(authErrorKey(error));
      else setResent(true);
    } catch {
      setError("auth.unexpected");
    }
  }

  if (step === "sent")
    return (
      <div role="status" className={styles.panel}>
        <span className={`pop ${styles.seal}`}>
          <IconMail size={26} strokeWidth={1.6} />
        </span>
        <div className={styles.head}>
          <p className={styles.sectionLabel}>{t("account.lastStep")}</p>
          <h1 ref={heading} tabIndex={-1} className={`rise ${styles.title}`}>
            {t("auth.checkInbox")}
          </h1>
          <p className={`rise ${styles.lead}`}>{t("auth.checkInboxText", { email: who.email })}</p>
        </div>
        <FormError error={error} wait={wait} />
        {resent && <Notice tone="success">{t("auth.resent")}</Notice>}
        <div className={`rise ${styles.buttons}`}>
          <Button onClick={resend} disabled={resent || wait.waiting}>
            {t("auth.resend")}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setResent(false);
              setError(null);
              setStep(1);
            }}
          >
            {t("auth.wrongEmail")}
          </Button>
        </div>
      </div>
    );

  return (
    <div className={styles.panel}>
      <div className={styles.steps}>
        <p className={styles.stepsLabel}>{t("auth.step", { n: step, total: 2 })}</p>
        <div className={styles.stepsBar} aria-hidden="true">
          <span className={styles.segment}>
            <span className={`fill-in ${styles.segmentFill}`} />
          </span>
          <span className={styles.segment}>{step === 2 && <span className={`fill-in ${styles.segmentFill}`} />}</span>
        </div>
      </div>

      {step === 1 ? (
        <form
          key="who"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            setWho({ name: String(form.get("name")).trim(), email: String(form.get("email")).trim() });
            setStep(2);
          }}
          className={`rise ${styles.fields}`}
        >
          <div className={styles.head}>
            {/* The open tab already writes « Créer un compte » above. */}
            <h1 ref={heading} tabIndex={-1} className="visually-hidden">
              {t("auth.signUpTitle")}
            </h1>
            <p className={styles.lead}>{t("auth.signUpIntro")}</p>
          </div>
          <SignedInNotice />
          <Section number="01" title={t("account.sectionAccount")}>
            <FieldRow>
              <Field id="name" label={t("auth.name")} required maxLength={100} autoComplete="name" defaultValue={who.name} />
              <Field id="email" label={t("auth.email")} type="email" required autoComplete="email" inputMode="email" defaultValue={who.email} hint={t("auth.emailHint")} />
            </FieldRow>
          </Section>
          <Section number="02" title={t("account.sectionArtist")}>
            <Switch
              name="publish"
              checked={publish}
              onChange={(event) => setPublish(event.target.checked)}
              label={t("account.publishSwitch")}
              hint={publish ? t("account.publishHintOn") : t("account.publishHintOff")}
            />
          </Section>
          <Actions>
            <CancelLink />
            <Button type="submit" withArrow>
              {t("auth.continue")}
            </Button>
          </Actions>
        </form>
      ) : (
        <form
          key="password"
          onSubmit={(event) => {
            event.preventDefault();
            if (ready && !wait.waiting) void create();
          }}
          className={`rise ${styles.fields}`}
        >
          <div className={styles.head}>
            <h1 ref={heading} tabIndex={-1} className={styles.title}>
              {t("auth.choosePassword")}
            </h1>
            <p className={styles.who}>
              <span className={styles.whoName}>
                {who.name} · {who.email}
              </span>
              <button type="button" onClick={() => setStep(1)} className={styles.quiet}>
                <IconBack size={14} strokeWidth={2} />
                {t("auth.edit")}
              </button>
            </p>
          </div>
          {/* Lets password managers save the pair under the right account. */}
          <input type="email" name="username" autoComplete="username" value={who.email} readOnly hidden />
          <FieldRow>
            <div className={styles.cell}>
              <PasswordField
                id="password"
                label={t("auth.password")}
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
                hint={!password ? t("auth.passwordHelp", { min: MIN_PASSWORD_LENGTH }) : problems.tooShort ? count : <Met>{count}</Met>}
              />
              <div className={styles.meter} aria-hidden={!meter}>
                <span className={styles.meterTrack}>
                  <span className={styles.meterFill} data-level={strength} />
                </span>
                <span className={styles.meterLabel}>{meter && t(meter)}</span>
              </div>
            </div>
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
          <p className={styles.pledge}>{t("account.pledge")}</p>
          <FormError error={error} wait={wait} />
          <Actions>
            <Button type="submit" withArrow loading={busy} disabled={!ready || wait.waiting}>
              {busy ? t("auth.creating") : t("auth.signUpSubmit")}
            </Button>
          </Actions>
        </form>
      )}
    </div>
  );
}
