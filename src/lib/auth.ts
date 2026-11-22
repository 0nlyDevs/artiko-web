// Better Auth server: owns users and sessions (schema `better_auth`) and signs the JWTs that
// artiko-api verifies against /api/auth/jwks. Issuer and audience are the app's own URL,
// which is what the API expects in AUTH_ISSUER / AUTH_AUDIENCE.
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { bearer } from "better-auth/plugins/bearer";
import { haveIBeenPwned } from "better-auth/plugins/haveibeenpwned";
import { jwt } from "better-auth/plugins/jwt";
import { after } from "next/server";
import { Pool } from "pg";
import { accountEmail, emailLocale, sendEmail, type AccountEmail } from "./email";
import { MIN_PASSWORD_LENGTH } from "./password";

const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

const isSecureOrigin = baseURL.startsWith("https://");
const isLocalOrigin = ["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname);

// Brute-force limits for the credential endpoints (stricter than Better Auth's global default).
const SIGN_IN_WINDOW_SECONDS = 60;
const SIGN_IN_MAX_ATTEMPTS = 5;
// Verification and reset links stop working after an hour.
const LINK_LIFETIME_SECONDS = 60 * 60;

/**
 * Sends after the response: the reply takes the same time whether the address exists or not (no
 * account enumeration by timing), and a mail outage never turns into a failed sign-up.
 */
function sendLater(kind: AccountEmail, to: string, url: string, request?: Request) {
  // The address stays out of the log: it is personal data.
  after(() => sendEmail(accountEmail(kind, emailLocale(request), to, url)).catch((error) => console.error(`[email] ${kind} failed`, error)));
}

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
    // Accounts must confirm their address before they can sign in: without a mailer nobody could.
    if (!process.env.RESEND_API_KEY?.trim() || !process.env.EMAIL_FROM?.trim()) {
      throw new Error("RESEND_API_KEY and EMAIL_FROM must be set to send verification and reset emails");
    }
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
    emailAndPassword: {
      enabled: true,
      minPasswordLength: MIN_PASSWORD_LENGTH,
      // No session until the address is confirmed: fake addresses cannot vote or publish.
      requireEmailVerification: true,
      resetPasswordTokenExpiresIn: LINK_LIFETIME_SECONDS,
      // A reset ends every open session, including one an attacker may hold.
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }, request) => sendLater("reset", user.email, url, request),
      // Signing up again with a registered address answers like a new account (no enumeration), so
      // the owner gets a note pointing to sign-in and reset instead of waiting for a link that never comes.
      onExistingUserSignUp: async ({ user }, request) => sendLater("existing", user.email, `${baseURL}/forgot-password`, request),
    },
    emailVerification: {
      sendOnSignUp: true,
      // Signing in to an unverified account sends a fresh link instead of a dead end.
      sendOnSignIn: true,
      // The link confirms the address but opens no session: whoever registered the address first, with a
      // password of their choosing, would otherwise share the account its owner just activated.
      autoSignInAfterVerification: false,
      expiresIn: LINK_LIFETIME_SECONDS,
      sendVerificationEmail: async ({ user, url }, request) => sendLater("verify", user.email, url, request),
    },
    rateLimit: {
      enabled: true,
      // Counts live in the database so every instance shares them and a restart does not reset them.
      storage: "database",
      customRules: {
        "/sign-in/email": { window: SIGN_IN_WINDOW_SECONDS, max: SIGN_IN_MAX_ATTEMPTS },
        "/sign-up/email": { window: SIGN_IN_WINDOW_SECONDS, max: SIGN_IN_MAX_ATTEMPTS },
        // /send-verification-email and /request-password-reset keep Better Auth's own stricter defaults.
        "/reset-password": { window: SIGN_IN_WINDOW_SECONDS, max: SIGN_IN_MAX_ATTEMPTS },
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
      // Refuses passwords found in known breaches (k-anonymity: only a hash prefix leaves the server).
      haveIBeenPwned(),
      nextCookies(),
    ],
  });
}

let instance: ReturnType<typeof createAuth> | undefined;

/** Created on first use, so `next build` needs no secret but a misconfigured server fails on its first request. */
export function getAuth() {
  return (instance ??= createAuth());
}
