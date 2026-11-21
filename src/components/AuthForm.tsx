"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
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
    if (error) return setError(error.message ?? "That did not work. Check your email and password.");
    router.push("/me");
  }

  const field = "w-full border-2 border-ink bg-ground px-3 py-2";
  return (
    <form action={submit} className="flex max-w-md flex-col gap-5">
      {signUp && (
        <div className="flex flex-col gap-1">
          <label htmlFor="name" className="font-bold">Your name</label>
          <input id="name" name="name" required autoComplete="name" className={field} />
        </div>
      )}
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="font-bold">Email</label>
        <input id="email" name="email" type="email" required autoComplete="email" className={field} />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="font-bold">Password</label>
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
        <p id="password-help">At least 8 characters.</p>
      </div>
      {error && <p role="alert" className="text-red">{error}</p>}
      <button type="submit" disabled={busy} className="self-start bg-ink px-5 py-3 font-bold text-ground disabled:opacity-60">
        {signUp ? "Create my account" : "Sign in"}
      </button>
      <p>
        {signUp ? "Already on Artiko? " : "New to Artiko? "}
        <Link href={signUp ? "/sign-in" : "/sign-up"} className="underline underline-offset-4">
          {signUp ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </form>
  );
}
