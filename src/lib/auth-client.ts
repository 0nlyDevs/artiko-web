import { jwtClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

// `authClient.token()` returns the JWT to pass to `withToken()` from `@/lib/api`.
export const authClient = createAuthClient({ plugins: [jwtClient()] });
