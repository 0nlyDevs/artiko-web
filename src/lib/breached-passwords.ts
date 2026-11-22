import type { BetterAuthPlugin } from "better-auth";
import { APIError, isAPIError } from "better-auth/api";
import { haveIBeenPwned } from "better-auth/plugins/haveibeenpwned";

// The official plugin's messages for an outage (`haveibeenpwned/index.mjs:37,41`), its only mark of one.
const OUTAGE_MESSAGE_PREFIX = "Failed to check password";

const isBreachServiceOutage = (error: unknown) =>
  isAPIError(error) && error.statusCode === 500 && error.message.startsWith(OUTAGE_MESSAGE_PREFIX);

const PASSWORD_CHECK_UNAVAILABLE = {
  code: "PASSWORD_CHECK_UNAVAILABLE",
  message: "The password could not be checked against known breaches. Try again in a few minutes.",
} as const;

/**
 * Wraps the password hash that `haveIBeenPwned` already wraps, so it must come after it. The official
 * plugin answers an outage of the breach service with a bare 500 and has no option to change that.
 */
function reportPasswordCheckOutage(): BetterAuthPlugin {
  return {
    id: "password-check-outage",
    init(ctx) {
      const hash = ctx.password.hash;
      return {
        context: {
          password: {
            ...ctx.password,
            async hash(password: string) {
              try {
                return await hash(password);
              } catch (error) {
                if (isBreachServiceOutage(error)) throw APIError.from("SERVICE_UNAVAILABLE", PASSWORD_CHECK_UNAVAILABLE, { cause: error });
                throw error;
              }
            },
          },
        },
      };
    },
  };
}

/** Refuses passwords found in known breaches (k-anonymity: only a hash prefix leaves the server), and stays closed while the check is down. */
export function breachedPasswordCheck() {
  return [haveIBeenPwned(), reportPasswordCheckOutage()] as const;
}
