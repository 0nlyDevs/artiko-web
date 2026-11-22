/** The query parameter that carries the page to come back to after signing in: `/sign-in?next=/works/12`. */
export const RETURN_PARAM = "next";

/** The page a person lands on after signing in when nothing else was asked. */
export const DEFAULT_DESTINATION = "/me";

/** Where the switch « I also want to publish my works » of the sign-up form leads at the first sign-in. */
export const PROFILE_DESTINATION = "/me?tab=profile";

// Any origin that no real address resolves to: it only tells a path of this site from an absolute address.
const BASE = "http://kanto.invalid";
// Coming back to an account page or to an API route would make no sense after signing in.
const NO_RETURN = ["/sign-in", "/sign-up", "/forgot-password", "/reset-password", "/api"];

/**
 * A page of this site to come back to, or null. Only a path is accepted (`/works/12?x=1#y`): never another
 * site (`https://…`, `//host`, `/\host`), never an account page, never an API route.
 */
export function safeReturnPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(value)) return null;
  let url: URL;
  try {
    url = new URL(value, BASE);
  } catch {
    return null;
  }
  if (url.origin !== BASE) return null;
  if (NO_RETURN.some((path) => url.pathname === path || url.pathname.startsWith(`${path}/`))) return null;
  return `${url.pathname}${url.search}${url.hash}`;
}

/** An account page's address that keeps the way back: `withReturn("/sign-up", "/works/12")`. */
export function withReturn(path: string, next: string | null | undefined): string {
  const safe = safeReturnPath(next);
  return safe ? `${path}?${RETURN_PARAM}=${encodeURIComponent(safe)}` : path;
}

/** For a « Sign in » link on any screen: the sign-in page, then back to `from`. */
export function signInHref(from: string | null | undefined): string {
  return withReturn("/sign-in", from);
}

/**
 * Where a successful sign-in leads: back to the page the person came from, else to the artist profile
 * when the sign-up switch asked for it (`wantsToPublish` is only called, and so only used up, in that case),
 * else to my space.
 */
export function destinationAfterSignIn(next: string | null | undefined, wantsToPublish: () => boolean): string {
  return safeReturnPath(next) ?? (wantsToPublish() ? PROFILE_DESTINATION : DEFAULT_DESTINATION);
}
