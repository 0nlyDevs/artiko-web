import { describe, expect, it } from "vitest";
import { authErrorKey } from "./errors";

describe("authErrorKey", () => {
  it("explains the codes a person can act on", () => {
    expect(authErrorKey({ code: "EMAIL_NOT_VERIFIED", status: 403 })).toBe("auth.notVerified");
    expect(authErrorKey({ code: "PASSWORD_COMPROMISED", status: 400 })).toBe("auth.compromised");
    expect(authErrorKey({ code: "TOKEN_EXPIRED" })).toBe("auth.linkInvalid");
  });

  it("puts the rate limit before any code", () => {
    expect(authErrorKey({ code: "INVALID_EMAIL_OR_PASSWORD", status: 429 })).toBe("auth.tooMany");
  });

  it("falls back to a generic line", () => {
    expect(authErrorKey({ code: "SOMETHING_NEW" })).toBe("auth.unexpected");
    expect(authErrorKey({})).toBe("auth.unexpected");
  });
});
