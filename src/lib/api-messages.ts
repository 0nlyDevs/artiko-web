import type { Key } from "@/i18n/en";
import type { ApiError } from "@/lib/api";

// The error codes a person can meet on the web, each with the dictionary key of its text. They are artiko-api's
// (`app/platform/errors.py`, the features that raise them, `openapi.yml`) plus the two `unwrap` gives when the
// API did not answer in its own shape. A Map, so a code such as `constructor` or `__proto__` never reads the
// prototype of a plain object.
//
// Left out on purpose: the codes only the Android capture flow produces (registering a phone's hardware key,
// sending a signed in-app capture as proof), which the web never calls. They keep the API's message.
const CODES = new Map<string, Key>([
  // Ours (src/lib/api.ts)
  ["unreachable", "api.unreachable"],
  ["not_found", "api.not_found"],

  // The token. `unauthorized` is also what getApiToken raises when nobody is signed in.
  ["unauthorized", "api.unauthorized"],
  ["invalid_token", "api.invalid_token"],
  ["email_not_verified", "vote.emailNotVerified"],
  ["not_an_artist", "api.not_an_artist"],

  // Votes
  ["already_voted", "vote.already_voted"],
  ["own_work", "vote.own_work"],
  ["not_eligible", "vote.notEligible"],
  ["not_in_contest", "vote.notInContest"],

  // Publishing a work
  ["duplicate_work", "api.duplicate_work"],
  ["possible_copy", "api.possible_copy"],
  ["invalid_exposition", "api.invalid_exposition"],
  ["too_many_proofs", "api.too_many_proofs"],
  ["extras_need_model", "api.extras_need_model"],
  ["invalid_model_hd", "api.invalid_model_hd"],
  ["invalid_poster", "api.invalid_poster"],

  // Files
  ["file_too_large", "api.file_too_large"],
  ["empty_file", "api.empty_file"],
  ["unsupported_file", "api.unsupported_file"],
  ["not_an_image", "api.not_an_image"],

  // Things that are not there
  ["work_not_found", "api.work_not_found"],
  ["artist_not_found", "api.artist_not_found"],
  ["exposition_not_found", "api.exposition_not_found"],
  ["practice_not_found", "api.practice_not_found"],
  ["media_not_found", "api.file_not_found"],
  ["proof_not_found", "api.file_not_found"],
  ["invalid_link", "api.invalid_link"],

  // The service itself. The API counts requests per minute, as Better Auth does for sign-in: same sentence.
  ["invalid_request", "api.invalid_request"],
  ["rate_limited", "auth.tooMany"],
  ["internal_error", "api.internal_error"],
  ["not_ready", "api.not_ready"],
]);

// A screen that says a refusal in its own words.
const PLACES = {
  space: new Map<string, Key>([
    ["email_not_verified", "space.unverified"],
    ["unreachable", "space.error"],
  ]),
};

export type ApiErrorPlace = keyof typeof PLACES;

/** The dictionary key of an API error code, or undefined for a code we have no text for. */
export function apiErrorKey(code: string, place?: ApiErrorPlace): Key | undefined {
  return (place && PLACES[place].get(code)) ?? CODES.get(code);
}

/** What to show for a failed API call: our text for a code we know, else the API's own message. */
export function apiErrorText(error: ApiError, t: (key: Key) => string, place?: ApiErrorPlace): string {
  const key = apiErrorKey(error.code, place);
  return key ? t(key) : error.message;
}
