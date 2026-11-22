"use client";

import Link from "next/link";
import { useState, type InputHTMLAttributes, type ReactNode } from "react";
import type { Key } from "@/i18n/en";
import { useT } from "@/i18n/locale";
import { IconEye } from "@/lib/ui/icons";
import { StatusBanner, UnderlinedField, type UnderlinedFieldProps } from "@/lib/ui/kanto";
import type { RetryAfter } from "@/features/auth/retry-after";
import styles from "./account.module.css";

type Extras = Pick<UnderlinedFieldProps, "hint" | "hintTone" | "error">;
type Input = Omit<InputHTMLAttributes<HTMLInputElement>, "className">;

/** A labelled field on a hairline (Figma « Champ souligné »). It is sent under its `id`. */
export function Field({ id, label, ...input }: { id: string; label: string } & Extras & Input) {
  return <UnderlinedField id={id} name={id} label={label} {...input} />;
}

/** A password field with a show/hide eye; `shown` can be shared so both fields of a pair switch together. */
export function PasswordField({ id, label, shown, onToggle, ...input }: { id: string; label: string; shown: boolean; onToggle: () => void } & Extras & Input) {
  const { t } = useT();
  return (
    <UnderlinedField
      id={id}
      name={id}
      label={label}
      type={shown ? "text" : "password"}
      trailing={
        <button type="button" onClick={onToggle} aria-label={shown ? t("auth.hidePassword") : t("auth.showPassword")} aria-pressed={shown} aria-controls={id} className={styles.eye}>
          <IconEye size={20} />
        </button>
      }
      {...input}
    />
  );
}

export function useToggle(initial = false) {
  const [on, setOn] = useState(initial);
  return [on, () => setOn((v) => !v)] as const;
}

/** An error or notice in a form (Figma « Messages système »): an error is announced as an alert, the rest as a status. */
export function Notice({ tone = "error", children }: { tone?: "error" | "info" | "success"; children: ReactNode }) {
  return <StatusBanner tone={tone}>{children}</StatusBanner>;
}

/**
 * The error of a form. A rate limit that says how long to wait shows a countdown under its sentence
 * (not read aloud second by second), then says the form can be sent again.
 */
export function FormError({ error, wait, children }: { error: Key | null; wait: RetryAfter; children?: ReactNode }) {
  const { t } = useT();
  if (!error) return null;
  if (error === "auth.tooMany" && wait.left === 0) return <Notice tone="info">{t("account.retryNow")}</Notice>;
  return (
    <Notice>
      {t(error)}
      {error === "auth.tooMany" && wait.waiting && (
        <span aria-hidden="true" className={styles.noticeLine}>
          {t("account.retryIn", { seconds: wait.left ?? 0 })}
        </span>
      )}
      {children}
    </Notice>
  );
}

/** « 01 — VOTRE COMPTE »: a numbered label over a group of fields. */
export function Section({ number, title, children }: { number?: string; title: string; children: ReactNode }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionLabel}>
        {number !== undefined && `${number} — `}
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Two fields side by side from 640 px. */
export function FieldRow({ children }: { children: ReactNode }) {
  return <div className={styles.row}>{children}</div>;
}

/** Foot of a form: a quiet note on the left, the actions on the right. */
export function Actions({ note, children }: { note?: ReactNode; children: ReactNode }) {
  return (
    <div className={styles.actions}>
      {note !== undefined && <span className={styles.note}>{note}</span>}
      {children}
    </div>
  );
}

/** A quiet underlined link: « Mot de passe oublié ? », « Retour à la connexion ». */
export function QuietLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={styles.quiet}>
      {children}
    </Link>
  );
}

/** « Annuler »: leaves the account pages, as the way back of the header does. */
export function CancelLink() {
  const { t } = useT();
  return (
    <Link href="/explore" className={styles.ghost}>
      {t("account.cancel")}
    </Link>
  );
}

/** A rule met, as the frame writes it: « ✓ 12 caractères · 10 minimum ». */
export function Met({ children }: { children: ReactNode }) {
  return (
    <>
      <span aria-hidden="true">✓ </span>
      {children}
    </>
  );
}
