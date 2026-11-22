import { jwtClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

// `authClient.token()` returns the JWT for the API: `callWithToken()` from `@/lib/api-token` fetches it and sends it.
export const authClient = createAuthClient({ plugins: [jwtClient()] });
