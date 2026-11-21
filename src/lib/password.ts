/** Enforced by the auth server (`auth.ts`) and shown by the sign-up form, so the two cannot drift apart. */
export const MIN_PASSWORD_LENGTH = 10;

/** What still blocks a new password: too short, or the confirmation differs. Shown live under the fields. */
export function passwordProblems(password: string, confirm: string) {
  return { tooShort: password.length < MIN_PASSWORD_LENGTH, mismatch: !password || password !== confirm };
}

/**
 * 0 (empty) to 3: long enough, mixes in a digit or symbol, reaches 14 characters. A hint for the
 * person typing, not a rule: the server's checks (length, known breaches) decide.
 */
export function passwordStrength(password: string): 0 | 1 | 2 | 3 {
  if (!password) return 0;
  const long = password.length >= MIN_PASSWORD_LENGTH;
  const mixed = /[^A-Za-z]/.test(password) && /[A-Za-z]/.test(password);
  return Math.max(1, Number(long) + Number(long && mixed) + Number(long && password.length >= 14)) as 1 | 2 | 3;
}
