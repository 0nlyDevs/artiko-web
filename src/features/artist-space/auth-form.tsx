"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/i18n/locale";
import { clearApiToken } from "@/lib/api-token";
import { authClient } from "@/lib/auth-client";
import { field } from "@/features/artist-space/profile-form";

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const { t, rich } = useT();
  // The auth service's own message is kept; null means a generic failure, translated on render.
  const [error, setError] = useState<{ message: string | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const signUp = mode === "sign-up";

  async function submit(form: FormData) {
    setBusy(true);
    setError(null);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    const { error } = signUp
      ? await authClient.signUp.email({ email, password, name: String(form.get("name")) })
      : await authClient.signIn.email({ email, password });
    setBusy(false);
    if (error) return setError({ message: error.message ?? null });
    // A token cached for a previous account must never be sent as this one.
    clearApiToken();
    router.push("/me");
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-heading text-7xl">{signUp ? t("auth.signUpTitle") : t("auth.signInTitle")}</h1>
      {signUp && <p className="max-w-2xl text-xl">{t("auth.signUpIntro")}</p>}
      <form onSubmit={(event) => {
          // Not `action={...}`: React resets the fields after an action even when it fails, wiping what was typed.
          event.preventDefault();
          void submit(new FormData(event.currentTarget));
        }} className="flex max-w-md flex-col gap-5">
        {signUp && (
          <div className="flex flex-col gap-1">
            <label htmlFor="name" className="font-bold">{t("auth.name")}</label>
            <input id="name" name="name" required autoComplete="name" className={field} />
          </div>
        )}
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="font-bold">{t("auth.email")}</label>
          <input id="email" name="email" type="email" required autoComplete="email" className={field} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="font-bold">{t("auth.password")}</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete={signUp ? "new-password" : "current-password"}
            aria-describedby="password-help"
            className={field}
          />
          <p id="password-help">{t("auth.passwordHelp")}</p>
        </div>
        {error && <p role="alert" className="border-l-4 border-red pl-3">{error.message ?? t("auth.failed")}</p>}
        <button type="submit" disabled={busy} className="self-start bg-ink px-5 py-3 font-bold text-paper disabled:opacity-60">
          {signUp ? t("auth.signUpSubmit") : t("auth.signInSubmit")}
        </button>
        <p>
          {rich(signUp ? "auth.haveAccount" : "auth.newHere", {
            link: (text) => (
              <Link href={signUp ? "/sign-in" : "/sign-up"} className="underline underline-offset-4">
                {text}
              </Link>
            ),
          })}
        </p>
      </form>
    </div>
  );
}
