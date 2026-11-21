"use client";

import { useState, type InputHTMLAttributes } from "react";
import { useT } from "@/i18n/locale";
import { IconEye } from "@/lib/ui/icons";

/** A labelled pill field. */
export function Field({ id, label, hint, ...input }: { id: string; label: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-semibold">
        {label}
      </label>
      <input id={id} name={id} aria-describedby={hint ? `${id}-hint` : undefined} className="input" {...input} />
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

/** A password field with a show/hide eye; `shown` can be shared so both fields of a pair switch together. */
export function PasswordField({
  id,
  label,
  shown,
  onToggle,
  ...input
}: { id: string; label: string; shown: boolean; onToggle: () => void } & InputHTMLAttributes<HTMLInputElement>) {
  const { t } = useT();
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-semibold">
        {label}
      </label>
      <div className="relative">
        <input id={id} name={id} type={shown ? "text" : "password"} className="input pr-14" {...input} />
        <button
          type="button"
          onClick={onToggle}
          aria-label={shown ? t("auth.hidePassword") : t("auth.showPassword")}
          aria-pressed={shown}
          aria-controls={id}
          className="absolute inset-y-0 right-1.5 my-auto inline-flex size-10 items-center justify-center rounded-full text-muted transition-colors hover:bg-white hover:text-ink"
        >
          <IconEye size={20} />
        </button>
      </div>
    </div>
  );
}

export function useToggle(initial = false) {
  const [on, setOn] = useState(initial);
  return [on, () => setOn((v) => !v)] as const;
}

/** An error or notice under a form. */
export function Notice({ tone = "error", children }: { tone?: "error" | "info"; children: React.ReactNode }) {
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`pop rounded-md p-4 leading-relaxed ${tone === "error" ? "bg-[#FBE9E3] text-[#8E3524]" : "bg-surface"}`}>
      {children}
    </div>
  );
}
