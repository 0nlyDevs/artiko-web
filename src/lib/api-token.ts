"use client";

import { ApiError, withToken } from "@/lib/api";
import { authClient } from "@/lib/auth-client";

let cached: { token: string; exp: number } | null = null;
// The request to /api/auth/token in flight: every call that arrives before its answer shares it.
let pending: Promise<string> | null = null;

/** The claims of a JWT, or null when the payload cannot be read. JWT payloads are base64url, which `atob` rejects. */
function tokenClaims(token: string): { exp?: unknown; sub?: unknown } | null {
  try {
    const base64 = (token.split(".")[1] ?? "").replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
    const claims: unknown = JSON.parse(new TextDecoder().decode(bytes));
    return typeof claims === "object" ? claims : null;
  } catch {
    return null;
  }
}

/** The `exp` claim (seconds) of a JWT, or 0 when the payload cannot be read. */
export function tokenExpiry(token: string): number {
  const exp = tokenClaims(token)?.exp;
  return typeof exp === "number" ? exp : 0;
}

/** The `sub` claim of a JWT, the account it was signed for (Better Auth puts the user id there), or null when it cannot be read. */
export function tokenSubject(token: string): string | null {
  const sub = tokenClaims(token)?.sub;
  return typeof sub === "string" && sub ? sub : null;
}

async function requestToken(): Promise<string> {
  const { data, error } = await authClient.token();
  // Better Auth answers 401 when nobody is signed in. Any other refusal (429, 5xx) is an outage of /api/auth/token,
  // not a missing session: it reads as a service that did not answer, never as "sign in first".
  if (error && error.status !== 401) throw new ApiError(error.status, "unreachable", "unreachable");
  // The API's own code for a call without a token; api-messages.ts has its text.
  if (error || !data) throw new ApiError(401, "unauthorized", "unauthorized");
  return data.token;
}

/** The signed-in user's Better Auth JWT for the API, reused until a minute before it expires. Calls made at the same time share one request. */
export function getApiToken(): Promise<string> {
  if (cached && cached.exp - 60 > Date.now() / 1000) return Promise.resolve(cached.token);
  if (!pending) {
    const request: Promise<string> = requestToken()
      .then((token) => {
        // An unreadable expiry (0) is never reused: the next call fetches a fresh token.
        // An answer that clearApiToken() overtook (sign-out, another account) is not kept.
        if (pending === request) cached = { token, exp: tokenExpiry(token) };
        return token;
      })
      .finally(() => {
        if (pending === request) pending = null;
      });
    pending = request;
  }
  return pending;
}

export function clearApiToken() {
  cached = null;
  pending = null;
}

const REFUSED_TOKEN = new Set(["unauthorized", "invalid_token"]);

/**
 * Runs an API call as the signed-in user. `call` receives the request options that carry the token and must
 * raise the API's error (`.then(unwrap)`). When the API refuses the token (401 `unauthorized` or `invalid_token`),
 * the token is dropped and the call replayed once with a new one, signed for the same account.
 * A second refusal and any other error reach the caller.
 */
export async function callWithToken<T>(call: (auth: ReturnType<typeof withToken>) => Promise<T>): Promise<T> {
  const token = await getApiToken();
  try {
    return await call(withToken(token));
  } catch (e) {
    if (!(e instanceof ApiError && e.status === 401 && REFUSED_TOKEN.has(e.code))) throw e;
    // Only the refused token is dropped: a call made at the same time may already have replaced it.
    if (cached?.token === token) cached = null;
    const renewed = await getApiToken();
    // The call is replayed for the person who made it, nobody else: when another account signed in meanwhile
    // (in this tab or another one), or the account cannot be read, the refusal reaches the caller instead.
    const subject = tokenSubject(token);
    if (!subject || tokenSubject(renewed) !== subject) throw e;
    return call(withToken(renewed));
  }
}
