import { describe, expect, it } from "vitest";
import { RETURN_PARAM as ACCOUNT_PARAM, signInHref as accountSignInHref } from "@/features/auth/return-to";
import { isInternalPath, RETURN_PARAM, signInHref } from "./sign-in-href";

describe("signInHref", () => {
  it("sends the visitor to the sign-in page with the notice to come back to", () => {
    expect(signInHref("/works/w1")).toBe("/sign-in?next=%2Fworks%2Fw1");
    expect(signInHref("/artists/a1/museum?work=w1")).toBe("/sign-in?next=%2Fartists%2Fa1%2Fmuseum%3Fwork%3Dw1");
  });

  it("never carries an address that is not a path of this site", () => {
    for (const elsewhere of ["https://evil.example/works/w1", "//evil.example", "/\\evil.example", "works/w1", "", "/works/w1\n"]) {
      expect(isInternalPath(elsewhere)).toBe(false);
      expect(signInHref(elsewhere)).toBe("/sign-in");
    }
    expect(signInHref()).toBe("/sign-in");
  });

  it("writes the address the sign-in page reads", () => {
    expect(RETURN_PARAM).toBe(ACCOUNT_PARAM);
    expect(signInHref("/works/w1")).toBe(accountSignInHref("/works/w1"));
  });
});
