import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { authClient } from "@/lib/auth-client";
import { resendVerification, VERIFIED_CALLBACK_URL, verificationNotice } from "./verification";

vi.mock("@/lib/auth-client", () => ({ authClient: { sendVerificationEmail: vi.fn() } }));

const source = (file: string) => readFileSync(new URL(file, import.meta.url), "utf8");

describe("verification links", () => {
  it("land on the sign-in page, since they open no session", () => {
    expect(VERIFIED_CALLBACK_URL).toBe("/sign-in?verified=1");
  });

  it("are resent with that callback", async () => {
    await resendVerification("a@example.test");
    expect(authClient.sendVerificationEmail).toHaveBeenCalledWith({ email: "a@example.test", callbackURL: VERIFIED_CALLBACK_URL });
  });

  it("use that callback from both the sign-up and the sign-in forms", () => {
    const signUp = source("./sign-up-form.tsx");
    const signIn = source("./sign-in-form.tsx");
    expect(signUp).toMatch(/signUp\.email\(\{[^}]*callbackURL: VERIFIED_CALLBACK_URL \}\)/);
    for (const form of [signUp, signIn]) {
      expect(form).toContain("resendVerification(");
      expect(form).not.toContain("sendVerificationEmail(");
    }
  });
});

describe("verificationNotice", () => {
  it("confirms the address after a valid link", () => {
    expect(verificationNotice(new URLSearchParams("verified=1"))).toBe("auth.verified");
  });

  it("explains a dead link, which Better Auth reports with error=", () => {
    expect(verificationNotice(new URLSearchParams("verified=1&error=TOKEN_EXPIRED"))).toBe("auth.linkInvalid");
  });

  it("says nothing on a plain visit", () => {
    expect(verificationNotice(new URLSearchParams())).toBeNull();
  });
});
