// The switch « I also want to publish my works » of the sign-up form. Signing up opens no session (the
// address must be confirmed first), so the artist profile cannot be created right away: the wish is kept
// in this browser and the first sign-in with the same address opens my space on the artist profile.

const STORAGE_KEY = "kanto.publish-intent";

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function browserStore(): Store | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    // Storage can be blocked: the person then reaches the profile from my space, as before.
    return null;
  }
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Keeps the wish for the account just created with `email`. */
export function rememberPublishIntent(email: string, store: Store | null = browserStore()) {
  try {
    store?.setItem(STORAGE_KEY, email.trim().toLowerCase());
  } catch {
    // Full or blocked storage: nothing to keep.
  }
}

/** Drops the wish: the switch was turned off, or another address was chosen. */
export function forgetPublishIntent(store: Store | null = browserStore()) {
  try {
    store?.removeItem(STORAGE_KEY);
  } catch {
    // Nothing was kept.
  }
}

/** True once, for the address that asked: the wish is used up by the sign-in that follows it. */
export function takePublishIntent(email: string, store: Store | null = browserStore()): boolean {
  try {
    const kept = store?.getItem(STORAGE_KEY);
    if (!kept || !same(kept, email)) return false;
    store?.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
