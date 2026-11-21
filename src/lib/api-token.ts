"use client";

import { ApiError } from "@/lib/api";
import { authClient } from "@/lib/auth-client";

let cached: { token: string; exp: number } | null = null;

/** The `exp` claim (seconds) of a JWT, or 0 when the payload cannot be read. JWT payloads are base64url, which `atob` rejects. */
export function tokenExpiry(token: string): number {
  try {
    const base64 = (token.split(".")[1] ?? "").replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
    const { exp } = JSON.parse(new TextDecoder().decode(bytes));
    return typeof exp === "number" ? exp : 0;
  } catch {
    return 0;
  }
}

/** The signed-in user's Better Auth JWT for the API, reused until a minute before it expires. */
export async function getApiToken(): Promise<string> {
  if (cached && cached.exp - 60 > Date.now() / 1000) return cached.token;
  const { data, error } = await authClient.token();
  if (error || !data) throw new ApiError(401, "unauthorized", "Sign in first.");
  // An unreadable expiry (0) is never reused: the next call fetches a fresh token.
  cached = { token: data.token, exp: tokenExpiry(data.token) };
  return data.token;
}

export function clearApiToken() {
  cached = null;
}
