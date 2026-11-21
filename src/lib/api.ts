// Entry point to artiko-api. Import the endpoint functions from here, never from `api-client` directly,
// so the base URL is always configured.
import { client } from "./api-client/client.gen";

client.setConfig({ baseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000" });

export * from "./api-client/sdk.gen";
export type * from "./api-client/types.gen";

/** Request options that authenticate a call with the JWT from Better Auth (`authClient.token()`). */
export const withToken = (token: string) => ({ headers: { Authorization: `Bearer ${token}` } });

/** The data of an SDK call, or an error carrying the API's `{error: {code, message}}`. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function unwrap<T>(result: { data?: T; error?: unknown; response?: Response }): T {
  if (result.data !== undefined && !result.error) return result.data;
  const body = result.error as { error?: { code?: string; message?: string } } | undefined;
  throw new ApiError(
    result.response?.status ?? 0,
    body?.error?.code ?? "unreachable",
    body?.error?.message ?? "The Artiko service did not answer.",
  );
}
