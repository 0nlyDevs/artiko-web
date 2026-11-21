"use client";

import { authClient } from "@/lib/auth-client";
import { api, ApiError } from "@/lib/api";

let cached: { token: string; exp: number } | null = null;

/** Short-lived JWT for the API, refreshed a minute before it expires. */
async function token(): Promise<string> {
  const now = Date.now() / 1000;
  if (cached && cached.exp - 60 > now) return cached.token;
  const { data, error } = await authClient.token();
  if (error || !data) throw new ApiError(401, "unauthorized", "Sign in first");
  cached = { token: data.token, exp: JSON.parse(atob(data.token.split(".")[1])).exp };
  return data.token;
}

export function clearToken() {
  cached = null;
}

/** Same as `api`, with the signed-in user's token. */
export async function authedApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${await token()}`);
  return api<T>(path, { ...init, headers });
}
