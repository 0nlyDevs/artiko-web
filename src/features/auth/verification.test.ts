import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { authClient } from "@/lib/auth-client";
import {
  MY_SPACE_VERIFIED_CALLBACK_URL,
  mySpaceVerificationNotice,
  resendVerification,
  VERIFIED_CALLBACK_URL,
  verificationNotice,
} from "./verification";

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

describe("links back to my space", () => {
  it("land on my space, confirmed", () => {
    expect(MY_SPACE_VERIFIED_CALLBACK_URL).toBe("/me?verified=1");
  });

  it("are what signing in and the resend button of my space pass", () => {
    const signIn = source("./sign-in-form.tsx");
    const mySpace = source("../artist-space/my-space.tsx");
    expect(signIn).toMatch(/signIn\.email\(\{[^}]*callbackURL: MY_SPACE_VERIFIED_CALLBACK_URL \}\)/);
    expect(mySpace).toMatch(/sendVerificationEmail\(\{[^}]*callbackURL: MY_SPACE_VERIFIED_CALLBACK_URL \}\)/);
    for (const file of [signIn, mySpace]) expect(file).not.toContain('callbackURL: "/me"');
  });

  it("show my space's notice through mySpaceVerificationNotice", () => {
    expect(source("../artist-space/my-space.tsx")).toContain("mySpaceVerificationNotice(params, Boolean(session))");
  });
});

describe("mySpaceVerificationNotice", () => {
  it("confirms the address to someone signed out", () => {
    expect(mySpaceVerificationNotice(new URLSearchParams("verified=1"), false)).toBe("auth.verified");
  });

  it("says nothing to someone signed in, who sees the space itself", () => {
    expect(mySpaceVerificationNotice(new URLSearchParams("verified=1"), true)).toBeNull();
    expect(mySpaceVerificationNotice(new URLSearchParams("verified=1&error=TOKEN_EXPIRED"), true)).toBeNull();
  });

  it("explains a dead link as on the sign-in page", () => {
    expect(mySpaceVerificationNotice(new URLSearchParams("verified=1&error=TOKEN_EXPIRED"), false)).toBe("auth.linkInvalid");
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
