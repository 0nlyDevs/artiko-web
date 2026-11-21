// Auth.js (NextAuth) with the Keycloak provider (SOLUTION-6, 12.5 and 12.6): Authorization Code
// flow with PKCE. The Keycloak access and refresh tokens live only in Auth.js's encrypted,
// HTTP-only session cookie. They are never put in the client session, so browser JavaScript
// cannot read them; server code gets the access token through `getAccessToken()`.
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import type { NextAuthOptions } from "next-auth";
import { type JWT, getToken } from "next-auth/jwt";
import KeycloakProvider from "next-auth/providers/keycloak";

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    /** Expiry of the access token, in seconds since the epoch. */
    expiresAt?: number;
    error?: "RefreshTokenError";
  }
}

declare module "next-auth" {
  interface Session {
    /** Set when Keycloak refused the refresh token: the user has to sign in again. */
    error?: "RefreshTokenError";
  }
}

// Read on first use, never at import, so `next build` needs no secrets but a misconfigured
// server fails on its first request instead of running unauthenticated.
function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

const EXPIRY_MARGIN_SECONDS = 15;

async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const response = await fetch(`${required("KEYCLOAK_ISSUER")}/protocol/openid-connect/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: required("KEYCLOAK_ID"),
        client_secret: required("KEYCLOAK_SECRET"),
        refresh_token: token.refreshToken ?? "",
      }),
    });
    const refreshed = await response.json();
    if (!response.ok) throw new Error(refreshed.error ?? "refresh failed");
    return {
      ...token,
      accessToken: refreshed.access_token,
      // Keycloak rotates refresh tokens: always keep the newest one.
      refreshToken: refreshed.refresh_token ?? token.refreshToken,
      expiresAt: Math.floor(Date.now() / 1000) + refreshed.expires_in,
      error: undefined,
    };
  } catch {
    return { ...token, error: "RefreshTokenError" };
  }
}

export function getAuthOptions(): NextAuthOptions {
  return {
    secret: required("NEXTAUTH_SECRET"),
    session: { strategy: "jwt" },
    providers: [
      KeycloakProvider({
        clientId: required("KEYCLOAK_ID"),
        clientSecret: required("KEYCLOAK_SECRET"),
        issuer: required("KEYCLOAK_ISSUER"),
      }),
    ],
    callbacks: {
      async jwt({ token, account }) {
        if (account) {
          return {
            ...token,
            accessToken: account.access_token,
            refreshToken: account.refresh_token,
            expiresAt: account.expires_at,
          };
        }
        if (token.expiresAt && Date.now() / 1000 < token.expiresAt - EXPIRY_MARGIN_SECONDS) return token;
        return refreshAccessToken(token);
      },
      // Only the error flag reaches the browser; the tokens stay in the cookie.
      async session({ session, token }) {
        session.error = token.error;
        return session;
      },
    },
  };
}

/** The signed-in user's Keycloak access token, for server components and route handlers. Undefined when signed out. */
export async function getAccessToken(): Promise<string | undefined> {
  const request = new NextRequest("http://localhost", { headers: { cookie: (await cookies()).toString() } });
  const token = await getToken({ req: request, secret: required("NEXTAUTH_SECRET") });
  return token?.error ? undefined : token?.accessToken;
}
