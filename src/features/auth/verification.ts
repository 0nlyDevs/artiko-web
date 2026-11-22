import type { Key } from "@/i18n/en";
import { authClient } from "@/lib/auth-client";

/** Where the links sent at sign-up and resent from the auth forms land: they confirm the address but open no session. */
export const VERIFIED_CALLBACK_URL = "/sign-in?verified=1";

/**
 * Where a link resent from my space lands. Signing in passes it too: Better Auth uses that callback both as the
 * redirect after a successful sign-in and in the link it emails to an unconfirmed account.
 */
export const MY_SPACE_VERIFIED_CALLBACK_URL = "/me?verified=1";

/** `fetchOptions` lets a form read the wait of a rate-limited answer (`useRetryAfter`). */
export function resendVerification(email: string, fetchOptions?: NonNullable<Parameters<typeof authClient.sendVerificationEmail>[0]["fetchOptions"]>) {
  if (fetchOptions) return authClient.sendVerificationEmail({ email, callbackURL: VERIFIED_CALLBACK_URL, fetchOptions });
  return authClient.sendVerificationEmail({ email, callbackURL: VERIFIED_CALLBACK_URL });
}

type Query = Pick<URLSearchParams, "get" | "has">;

/** Better Auth appends `error=` to the callback when the link is invalid or expired. */
export function verificationNotice(params: Query): Key | null {
  if (params.has("error")) return "auth.linkInvalid";
  return params.get("verified") === "1" ? "auth.verified" : null;
}

/** A signed-in visitor of my space sees the space itself, so the notice is for someone signed out only. */
export function mySpaceVerificationNotice(params: Query, signedIn: boolean): Key | null {
  return signedIn ? null : verificationNotice(params);
}
