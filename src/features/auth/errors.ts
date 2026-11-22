import type { Key } from "@/i18n/en";

// Better Auth error codes we can explain; anything else gets a generic line. A Map, so a code such as
// `constructor` or `__proto__` never reads the prototype of a plain object.
const CODES = new Map<string, Key>([
  ["INVALID_EMAIL_OR_PASSWORD", "auth.failed"],
  ["EMAIL_NOT_VERIFIED", "auth.notVerified"],
  ["PASSWORD_COMPROMISED", "auth.compromised"],
  ["PASSWORD_CHECK_UNAVAILABLE", "auth.checkUnavailable"],
  ["PASSWORD_TOO_SHORT", "auth.tooShort"],
  ["PASSWORD_TOO_LONG", "auth.tooLong"],
  ["USER_ALREADY_EXISTS", "auth.exists"],
  ["USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL", "auth.exists"],
  ["INVALID_TOKEN", "auth.linkInvalid"],
  ["TOKEN_EXPIRED", "auth.linkInvalid"],
]);

export function authErrorKey(error: { code?: string; status?: number }): Key {
  if (error.status === 429) return "auth.tooMany";
  return CODES.get(error.code ?? "") ?? "auth.unexpected";
}
