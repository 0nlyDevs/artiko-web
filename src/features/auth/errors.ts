import type { Key } from "@/i18n/en";

// Better Auth error codes we can explain; anything else gets a generic line.
const CODES: Record<string, Key> = {
  INVALID_EMAIL_OR_PASSWORD: "auth.failed",
  EMAIL_NOT_VERIFIED: "auth.notVerified",
  PASSWORD_COMPROMISED: "auth.compromised",
  PASSWORD_TOO_SHORT: "auth.tooShort",
  USER_ALREADY_EXISTS: "auth.exists",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "auth.exists",
  INVALID_TOKEN: "auth.linkInvalid",
  TOKEN_EXPIRED: "auth.linkInvalid",
};

export function authErrorKey(error: { code?: string; status?: number }): Key {
  if (error.status === 429) return "auth.tooMany";
  return CODES[error.code ?? ""] ?? "auth.unexpected";
}
