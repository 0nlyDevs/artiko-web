import type { Key } from "@/i18n/en";
import type { Vars } from "@/i18n/locales";
import { ApiError, type Work } from "@/lib/api";
import { apiErrorText } from "@/lib/api-messages";

/** Where an attempt to publish leads. */
export type PublishOutcome =
  /** 201: the confirmation, drawn from the work the API returned. */
  | { view: "done"; work: Work }
  /** 409 `possible_copy`: the refusal screen, with the case the API opened when it gave one. */
  | { view: "refused"; caseId: string | null }
  /**
   * Any other answer: back on the form with everything typed, the reason under the button. `error` is null
   * when no answer came at all. `profile` asks for the artist profile first (403 `not_an_artist`).
   */
  | { view: "form"; error: ApiError | null; profile: boolean };

export function publishedOutcome(work: Work): PublishOutcome {
  return { view: "done", work };
}

export function failedOutcome(error: unknown): PublishOutcome {
  if (!(error instanceof ApiError)) return { view: "form", error: null, profile: false };
  if (error.code === "possible_copy") return { view: "refused", caseId: error.caseId };
  return { view: "form", error, profile: error.code === "not_an_artist" };
}

/** The sentence under the button: the table of api-messages.ts, with the wait of a 429 when the API gives it. */
export function publishErrorText(error: ApiError | null, t: (key: Key, vars?: Vars) => string): string {
  if (!error) return t("publish.failed");
  if (error.code === "rate_limited" && error.retryAfter !== null) return t("publish.error.retryAfter", { n: error.retryAfter });
  return apiErrorText(error, t);
}
