import type { Key } from "@/i18n/en";
import { authClient } from "@/lib/auth-client";

/** Where every verification link sent from the auth forms lands: it confirms the address but opens no session. */
export const VERIFIED_CALLBACK_URL = "/sign-in?verified=1";

export function resendVerification(email: string) {
  return authClient.sendVerificationEmail({ email, callbackURL: VERIFIED_CALLBACK_URL });
}

/** Better Auth appends `error=` to the callback when the link is invalid or expired. */
export function verificationNotice(params: Pick<URLSearchParams, "get" | "has">): Key | null {
  if (params.has("error")) return "auth.linkInvalid";
  return params.get("verified") === "1" ? "auth.verified" : null;
}
