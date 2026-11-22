import { clearApiToken } from "@/lib/api-token";
import { authClient } from "@/lib/auth-client";

/**
 * Closes the session and forgets the API token. The token goes whatever the answer, so a failed request never
 * leaves it usable on this device. False when the session could not be closed: the person is still signed in.
 */
export async function signOutOfSpace(): Promise<boolean> {
  try {
    const { error } = await authClient.signOut();
    return !error;
  } catch {
    return false;
  } finally {
    clearApiToken();
  }
}
