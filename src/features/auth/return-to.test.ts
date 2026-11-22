import { describe, expect, it, vi } from "vitest";
import { destinationAfterSignIn, safeReturnPath, signInHref, withReturn } from "./return-to";

describe("safeReturnPath", () => {
  it("keeps a path of this site, with its query and its anchor", () => {
    expect(safeReturnPath("/works/12")).toBe("/works/12");
    expect(safeReturnPath("/me?tab=publish")).toBe("/me?tab=publish");
    expect(safeReturnPath("/artists/a1/museum?work=w2#notice")).toBe("/artists/a1/museum?work=w2#notice");
  });

  it.each(["https://evil.example/works/1", "//evil.example", "/\\evil.example", "/\\/evil.example", "javascript:alert(1)", "works/12", "", "/a\nb", "/\tevil"])(
    "refuses %j, which is not a path of this site",
    (value) => {
      expect(safeReturnPath(value)).toBeNull();
    },
  );

  it("says nothing without a value", () => {
    expect(safeReturnPath(null)).toBeNull();
    expect(safeReturnPath(undefined)).toBeNull();
  });

  it.each(["/sign-in", "/sign-in?verified=1", "/sign-up", "/forgot-password", "/reset-password?token=t", "/api/auth/sign-out"])(
    "never comes back to %j: an account page or an API route",
    (value) => {
      expect(safeReturnPath(value)).toBeNull();
    },
  );

  it("does not take a page that only starts like an account page for one", () => {
    expect(safeReturnPath("/sign-in-help")).toBe("/sign-in-help");
  });
});

describe("links that keep the way back", () => {
  it("carry it in ?next=, encoded", () => {
    expect(signInHref("/works/12?from=hall")).toBe("/sign-in?next=%2Fworks%2F12%3Ffrom%3Dhall");
    expect(withReturn("/sign-up", "/me?tab=publish")).toBe("/sign-up?next=%2Fme%3Ftab%3Dpublish");
  });

  it("stay plain when there is nowhere safe to come back to", () => {
    expect(signInHref(null)).toBe("/sign-in");
    expect(withReturn("/sign-up", "https://evil.example")).toBe("/sign-up");
  });
});

describe("destinationAfterSignIn", () => {
  it("goes back to the page the person came from, without using up the wish to publish", () => {
    const wantsToPublish = vi.fn(() => true);
    expect(destinationAfterSignIn("/works/12", wantsToPublish)).toBe("/works/12");
    expect(wantsToPublish).not.toHaveBeenCalled();
  });

  it("opens the artist profile when the sign-up switch asked for it", () => {
    expect(destinationAfterSignIn(null, () => true)).toBe("/me?tab=profile");
  });

  it("opens my space otherwise, as before", () => {
    expect(destinationAfterSignIn(null, () => false)).toBe("/me");
    expect(destinationAfterSignIn("https://evil.example", () => false)).toBe("/me");
  });
});
