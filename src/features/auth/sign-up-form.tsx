"use client";

import { useEffect, useRef, useState } from "react";
import type { Key } from "@/i18n/en";
import { useT } from "@/i18n/locale";
import { authClient } from "@/lib/auth-client";
import { MIN_PASSWORD_LENGTH, passwordProblems, passwordStrength } from "@/lib/password";
import { IconBack, IconCheck, IconMail } from "@/lib/ui/icons";
import { useAuthScene } from "@/features/auth/auth-doors";
import { authErrorKey } from "@/features/auth/errors";
import { Field, Notice, PasswordField, useToggle } from "@/features/auth/fields";

const METER = [
  { width: "0%", color: "var(--line)", label: null },
  { width: "34%", color: "var(--red)", label: "auth.weak" },
  { width: "67%", color: "#E09A2C", label: "auth.fair" },
  { width: "100%", color: "#2E8B57", label: "auth.strong" },
] as const;

/**
 * Two steps: who you are (name, email), then a password. The account is created only at the end;
 * it stays closed until the link sent to the address is opened.
 */
export function SignUpForm() {
  const { t } = useT();
  const setScene = useAuthScene();
  const [step, setStep] = useState<1 | 2 | "sent">(1);
  const [who, setWho] = useState({ name: "", email: "" });
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [terms, setTerms] = useState(false);
  const [shown, toggle] = useToggle();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Key | null>(null);
  const [resent, setResent] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);

  // The password step has its own video; leaving the page restores the default.
  useEffect(() => {
    setScene(step === 1 ? null : "palette");
    heading.current?.focus();
  }, [step, setScene]);
  useEffect(() => () => setScene(null), [setScene]);

  const problems = passwordProblems(password, confirm);
  const ready = !problems.tooShort && !problems.mismatch && terms;
  const meter = METER[passwordStrength(password)];

  async function create() {
    setBusy(true);
    setError(null);
    const { error } = await authClient.signUp.email({ ...who, password, callbackURL: "/me" });
    setBusy(false);
    if (error) return setError(authErrorKey(error));
    setStep("sent");
  }

  async function resend() {
    const { error } = await authClient.sendVerificationEmail({ email: who.email, callbackURL: "/me" });
    if (error) setError(authErrorKey(error));
    else setResent(true);
  }

  if (step === "sent")
    return (
      <div role="status" className="flex flex-col items-start gap-5">
        <span className="pop inline-flex size-[72px] items-center justify-center rounded-full bg-red text-white">
          <IconMail size={34} strokeWidth={2} />
        </span>
        <h1 ref={heading} tabIndex={-1} className="rise text-[40px] leading-none font-extrabold tracking-[-0.04em] outline-none">
          {t("auth.checkInbox")}
        </h1>
        <p className="rise leading-relaxed" style={{ animationDelay: "0.1s" }}>
          {t("auth.checkInboxText", { email: who.email })}
        </p>
        {error && <Notice>{t(error)}</Notice>}
        <div className="rise flex flex-wrap gap-2.5" style={{ animationDelay: "0.2s" }}>
          <button type="button" onClick={resend} disabled={resent} className="btn btn-ink">
            {resent ? t("auth.resent") : t("auth.resend")}
          </button>
          <button type="button" onClick={() => setStep(1)} className="btn btn-soft">
            {t("auth.wrongEmail")}
          </button>
        </div>
      </div>
    );

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-2.5">
        <p className="text-sm font-semibold text-muted">{t("auth.step", { n: step, total: 2 })}</p>
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="h-1 flex-1 overflow-hidden rounded-full bg-line">
            <span className="fill-in block h-full bg-red" />
          </span>
          <span className="h-1 flex-1 overflow-hidden rounded-full bg-line">{step === 2 && <span className="fill-in block h-full bg-red" />}</span>
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
          className="rise flex flex-col gap-5"
        >
          <div>
            <h1 ref={heading} tabIndex={-1} className="text-[40px] leading-none font-extrabold tracking-[-0.04em] outline-none">
              {t("auth.signUpTitle")}
            </h1>
            <p className="mt-3 leading-relaxed text-muted">{t("auth.signUpIntro")}</p>
          </div>
          <Field id="name" label={t("auth.name")} required maxLength={100} autoComplete="name" defaultValue={who.name} />
          <Field id="email" label={t("auth.email")} type="email" required autoComplete="email" inputMode="email" defaultValue={who.email} hint={t("auth.emailHint")} />
          <button type="submit" className="btn btn-ink mt-1 min-h-[52px] font-bold">
            {t("auth.continue")}
          </button>
        </form>
      ) : (
        <form
          key="password"
          onSubmit={(event) => {
            event.preventDefault();
            if (ready) void create();
          }}
          className="rise flex flex-col gap-5"
        >
          <div>
            <h1 ref={heading} tabIndex={-1} className="text-[40px] leading-none font-extrabold tracking-[-0.04em] outline-none">
              {t("auth.choosePassword")}
            </h1>
            <p className="mt-3.5 flex flex-wrap items-center gap-2">
              <span className="inline-flex min-h-8 items-center rounded-full bg-surface px-3.5 text-[15px]">
                {who.name} · {who.email}
              </span>
              <button type="button" onClick={() => setStep(1)} className="inline-flex items-center gap-1 text-sm text-muted underline underline-offset-4 hover:text-ink">
                <IconBack size={14} strokeWidth={2} />
                {t("auth.edit")}
              </button>
            </p>
          </div>
          {/* Lets password managers save the pair under the right account. */}
          <input type="email" name="username" autoComplete="username" value={who.email} readOnly hidden />
          <div className="flex flex-col gap-2.5">
            <PasswordField
              id="password"
              label={t("auth.password")}
              shown={shown}
              onToggle={toggle}
              required
              minLength={MIN_PASSWORD_LENGTH}
              autoComplete="new-password"
              aria-describedby="password-rules"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <div className="flex items-center gap-3" aria-hidden={!meter.label}>
              <span className="h-1 flex-1 overflow-hidden rounded-full bg-line">
                <span className="block h-full transition-all duration-300" style={{ width: meter.width, background: meter.color }} />
              </span>
              <span className="w-16 text-[13px] font-semibold text-muted">{meter.label && t(meter.label)}</span>
            </div>
          </div>
          <PasswordField
            id="confirm"
            label={t("auth.confirmPassword")}
            shown={shown}
            onToggle={toggle}
            required
            autoComplete="new-password"
            aria-describedby="password-rules"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          <ul id="password-rules" className="flex flex-col gap-1.5 text-sm">
            <Rule ok={!problems.tooShort} text={t("auth.passwordHelp", { min: MIN_PASSWORD_LENGTH })} />
            <Rule ok={!problems.mismatch} text={t("auth.passwordsMatch")} />
          </ul>
          <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed">
            <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} required className="mt-0.5 size-5 shrink-0 accent-[var(--ink)]" />
            {t("auth.terms")}
          </label>
          {error && <Notice>{t(error)}</Notice>}
          <button type="submit" disabled={!ready || busy} className="btn btn-ink mt-1 min-h-[52px] font-bold">
            {busy && <span className="spin" aria-hidden="true" />}
            {busy ? t("auth.creating") : t("auth.signUpSubmit")}
          </button>
        </form>
      )}
    </div>
  );
}

function Rule({ ok, text }: { ok: boolean; text: string }) {
  return (
    <li className={`flex items-center gap-2 transition-colors ${ok ? "text-[#1F6B40]" : "text-muted"}`}>
      <span key={String(ok)} className={`inline-flex size-[18px] items-center justify-center rounded-full ${ok ? "pop bg-[#E6F2EA]" : "bg-surface"}`}>
        {ok ? <IconCheck size={13} strokeWidth={3} /> : <span className="size-1 rounded-full bg-current" />}
      </span>
      {text}
    </li>
  );
}
