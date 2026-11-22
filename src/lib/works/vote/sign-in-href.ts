/** The query parameter that carries the page to come back to after signing in. */
export const RETURN_PARAM = "next";

/** A path of this site (`/works/…`), never another origin: `//host`, `/\host` and full addresses are refused. */
export function isInternalPath(path: string): boolean {
  return /^\/(?![/\\])/.test(path) && !/[\u0000-\u001f]/.test(path);
}

/** The sign-in page, with the address to return to when it is one of ours. */
export function signInHref(returnTo?: string): string {
  return returnTo && isInternalPath(returnTo) ? `/sign-in?${RETURN_PARAM}=${encodeURIComponent(returnTo)}` : "/sign-in";
}
