// Entry point to artiko-api. Import the endpoint functions from here, never from `api-client` directly,
// so the base URL is always configured.
import { client } from "./api-client/client.gen";

client.setConfig({ baseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000" });

export * from "./api-client/sdk.gen";
export type * from "./api-client/types.gen";

/** Request options that authenticate a call with the JWT from Better Auth (`authClient.token()`). */
export const withToken = (token: string) => ({ headers: { Authorization: `Bearer ${token}` } });

/**
 * A failed call, with the API's `{error: {code, message}}`. Two codes are ours: `unreachable` when no answer in
 * that shape came back, `not_found` for a path the API does not serve. `api-messages.ts` has the text of each code.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    /** The review case opened for a refused publication (409 `possible_copy`), else null. */
    readonly caseId: string | null = null,
    /** Seconds to wait before trying again (the `Retry-After` of a 429 `rate_limited`), or null when the answer does not say. */
    readonly retryAfter: number | null = null,
  ) {
    super(message);
  }
}

type ErrorBody = { error?: { code?: string; message?: string; case_id?: string }; detail?: unknown };

/**
 * `Retry-After` as seconds from now. The API sends whole seconds; a proxy may send an HTTP date instead.
 * Null when the header is absent or unreadable: a browser on another origin cannot read it until the API
 * lists it in `Access-Control-Expose-Headers`.
 */
function retryAfterSeconds(response: Response | undefined): number | null {
  const value = response?.headers.get("Retry-After")?.trim();
  if (!value) return null;
  if (/^\d+$/.test(value)) return Number(value);
  const date = Date.parse(value);
  return Number.isNaN(date) ? null : Math.max(0, Math.ceil((date - Date.now()) / 1000));
}

/** The data of an SDK call, or an `ApiError`. */
export function unwrap<T>(result: { data?: T; error?: unknown; response?: Response }): T {
  if (result.data !== undefined && !result.error) return result.data;
  const body = result.error as ErrorBody | undefined;
  // An unknown path gets the framework's own `{"detail": "Not Found"}` instead of the API's error shape.
  const unknownPath = result.response?.status === 404 && body?.detail === "Not Found";
  const code = body?.error?.code ?? (unknownPath ? "not_found" : "unreachable");
  throw new ApiError(
    result.response?.status ?? 0,
    code,
    // Without a message from the API the code stands in; what a person reads comes from api-messages.ts.
    body?.error?.message ?? code,
    body?.error?.case_id ?? null,
    retryAfterSeconds(result.response),
  );
}
