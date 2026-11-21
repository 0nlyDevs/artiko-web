"use client";

import { ApiError } from "@/lib/api";
import { authClient } from "@/lib/auth-client";

let cached: { token: string; exp: number } | null = null;

/** The signed-in user's Better Auth JWT for the API, reused until a minute before it expires. */
export async function getApiToken(): Promise<string> {
  if (cached && cached.exp - 60 > Date.now() / 1000) return cached.token;
  const { data, error } = await authClient.token();
  if (error || !data) throw new ApiError(401, "unauthorized", "Sign in first.");
  cached = { token: data.token, exp: JSON.parse(atob(data.token.split(".")[1])).exp };
  return data.token;
}

export function clearApiToken() {
  cached = null;
}
