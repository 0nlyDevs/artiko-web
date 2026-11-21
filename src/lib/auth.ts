// Better Auth server: owns users and sessions (schema `better_auth`) and signs the JWTs that
// artiko-api verifies against /api/auth/jwks. Issuer and audience are the app's own URL,
// which is what the API expects in AUTH_ISSUER / AUTH_AUDIENCE.
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { bearer } from "better-auth/plugins/bearer";
import { jwt } from "better-auth/plugins/jwt";
import { Pool } from "pg";

const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

const isSecureOrigin = baseURL.startsWith("https://");
const isLocalOrigin = ["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname);

// Brute-force limits for the credential endpoints (stricter than Better Auth's global default).
const SIGN_IN_WINDOW_SECONDS = 60;
const SIGN_IN_MAX_ATTEMPTS = 5;
const MIN_PASSWORD_LENGTH = 10;

// The rate limit keys on the client IP, so it must come from a header the hosting proxy sets and
// overwrites (`x-real-ip`, `cf-connecting-ip`, the platform's own). Any header a client can send
// lets an attacker pick a fresh IP per attempt, and `x-forwarded-for` is such a header: a proxy
// that appends to it still passes along what the client wrote. No default in production.
const CLIENT_IP_HEADER = process.env.AUTH_CLIENT_IP_HEADER?.trim().toLowerCase() || undefined;

function createAuth() {
  if (process.env.NODE_ENV === "production" && !isSecureOrigin && !isLocalOrigin) {
    throw new Error("BETTER_AUTH_URL must be an https URL in production");
  }
  if (process.env.NODE_ENV === "production" && !isLocalOrigin) {
    if (!CLIENT_IP_HEADER) throw new Error("AUTH_CLIENT_IP_HEADER must name the header your proxy overwrites with the client IP");
    if (CLIENT_IP_HEADER === "x-forwarded-for") throw new Error("AUTH_CLIENT_IP_HEADER cannot be x-forwarded-for: clients can set it");
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  // The API owns schema `app`; Better Auth keeps its tables apart in `better_auth`.
  pool.on("connect", (client) => client.query("SET search_path TO better_auth"));

  return betterAuth({
    baseURL,
    // No fallback: Better Auth refuses to serve in production without BETTER_AUTH_SECRET.
    secret: process.env.BETTER_AUTH_SECRET,
    database: pool,
    // Only this origin may call the auth endpoints with credentials (CSRF and origin checks).
    trustedOrigins: [baseURL],
    emailAndPassword: { enabled: true, minPasswordLength: MIN_PASSWORD_LENGTH },
    rateLimit: {
      enabled: true,
      // Counts live in the database so every instance shares them and a restart does not reset them.
      storage: "database",
      customRules: {
        "/sign-in/email": { window: SIGN_IN_WINDOW_SECONDS, max: SIGN_IN_MAX_ATTEMPTS },
        "/sign-up/email": { window: SIGN_IN_WINDOW_SECONDS, max: SIGN_IN_MAX_ATTEMPTS },
      },
    },
    advanced: {
      useSecureCookies: isSecureOrigin,
      // Unset (local development only): Better Auth's own default.
      ...(CLIENT_IP_HEADER && { ipAddress: { ipAddressHeaders: [CLIENT_IP_HEADER] } }),
    },
    plugins: [
      // EdDSA key pair by default, published at /api/auth/jwks.
      jwt({ jwt: { issuer: baseURL, audience: baseURL } }),
      // Lets the Android app exchange its session token for an API JWT.
      bearer(),
      nextCookies(),
    ],
  });
}

let instance: ReturnType<typeof createAuth> | undefined;

/** Created on first use, so `next build` needs no secret but a misconfigured server fails on its first request. */
export function getAuth() {
  return (instance ??= createAuth());
}
