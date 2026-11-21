// Entry point to artiko-api. Import the endpoint functions from here, never from `api-client` directly,
// so the base URL is always configured.
import { client } from "./api-client/client.gen";

client.setConfig({ baseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000" });

export * from "./api-client/sdk.gen";
export type * from "./api-client/types.gen";

/** Request options that authenticate a call with the Keycloak access token (see `getAccessToken()` in `@/lib/auth`). */
export const withToken = (token: string) => ({ headers: { Authorization: `Bearer ${token}` } });
