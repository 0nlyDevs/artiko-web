import { describe, expect, it } from "vitest";
import type { Key } from "@/i18n/en";
import { dictionaries, format, LOCALES, type Locale, type Vars } from "@/i18n/locales";
import { ApiError } from "@/lib/api";
import { apiErrorKey, apiErrorText } from "./api-messages";

// The reference list: every error code of artiko-api, read from `openapi.yml` and from what `app/` raises on its
// branches main and develop. `email_not_verified` is raised on feat/verified-email-tokens (`app/platform/auth.py`)
// and my space already handled it. Update the list when the API gains a code.
const WEB_CODES = [
  // app/platform: auth.py, rate_limit.py, storage.py, errors.py
  "unauthorized",
  "invalid_token",
  "email_not_verified",
  "rate_limited",
  "file_too_large",
  "empty_file",
  "unsupported_file",
  "invalid_request",
  "internal_error",
  // app/features: votes, works, expositions, artists, practices, media, scan, integrity, health
  "work_not_found",
  "not_eligible",
  "not_in_contest",
  "own_work",
  "already_voted",
  "not_an_artist",
  "invalid_exposition",
  "too_many_proofs",
  "duplicate_work",
  "possible_copy",
  "extras_need_model",
  "invalid_model_hd",
  "invalid_poster",
  "invalid_link",
  "proof_not_found",
  "exposition_not_found",
  "artist_not_found",
  "practice_not_found",
  "media_not_found",
  "not_an_image",
  "not_ready",
];

// Raised only where a phone registers its hardware key (`app/features/devices`) or sends a signed in-app capture
// as proof (`proof_claims`, checked by devices/service.py and platform/integrity.py). The web calls neither.
const ANDROID_CODES = [
  "nonce_unavailable",
  "invalid_nonce",
  "invalid_public_key",
  "invalid_attestation",
  "invalid_proof_claims",
  "incomplete_capture",
  "unknown_device",
  "capture_too_old",
  "capture_in_future",
  "bad_signature",
  "integrity_failed",
  "integrity_unavailable",
];

// Given on this side: by `unwrap` when the API did not answer in its own shape.
const OWN_CODES = ["unreachable", "not_found"];

const t = (locale: Locale) => (key: Key, vars?: Vars) => format(dictionaries[locale][key], vars);
const failure = (code: string, message = "The API's own message") => new ApiError(400, code, message);

describe("apiErrorKey", () => {
  it.each([...WEB_CODES, ...OWN_CODES])("has a text for %s in English, French and Malagasy", (code) => {
    const key = apiErrorKey(code);
    expect(key).toBeDefined();
    for (const locale of LOCALES) expect(apiErrorText(failure(code), t(locale)).trim()).not.toBe("");
    // A translation, not the fallback on the API's message.
    for (const locale of LOCALES) expect(apiErrorText(failure(code), t(locale))).not.toBe("The API's own message");
  });

  it("keeps the texts the vote already had", () => {
    expect(apiErrorKey("already_voted")).toBe("vote.already_voted");
    expect(apiErrorKey("own_work")).toBe("vote.own_work");
    expect(apiErrorKey("not_eligible")).toBe("vote.notEligible");
    expect(apiErrorKey("not_in_contest")).toBe("vote.notInContest");
    expect(apiErrorKey("email_not_verified")).toBe("vote.emailNotVerified");
  });

  it("lets my space say it in its own words", () => {
    expect(apiErrorKey("email_not_verified", "space")).toBe("space.unverified");
    expect(apiErrorKey("unreachable", "space")).toBe("space.error");
    // Any other code reads the same everywhere.
    expect(apiErrorKey("rate_limited", "space")).toBe(apiErrorKey("rate_limited"));
    expect(apiErrorKey("something_new", "space")).toBeUndefined();
  });

  it.each(["constructor", "__proto__", "toString", "hasOwnProperty"])("never reads %j from the prototype", (code) => {
    expect(apiErrorKey(code)).toBeUndefined();
    expect(apiErrorKey(code, "space")).toBeUndefined();
  });
});

describe("apiErrorText", () => {
  it("translates a code we know", () => {
    const refusal = failure("already_voted", "You already voted in this category this month");
    expect(apiErrorText(refusal, t("en"))).toBe("You already voted in this category this month.");
    expect(apiErrorText(refusal, t("fr"))).toBe("Vous avez déjà voté dans cette catégorie ce mois-ci.");
    expect(apiErrorText(refusal, t("mg"))).toBe("Efa nifidy tamin'ity sokajy ity ianao ity volana ity.");
  });

  it("falls back to the API's message for a code we do not know", () => {
    expect(apiErrorText(failure("something_new", "A refusal added after this build"), t("fr"))).toBe("A refusal added after this build");
  });

  it("names the refused file, as the API's message does", () => {
    // The messages of app/platform/storage.py.
    const tooLarge = new ApiError(413, "file_too_large", "timelapse.mp4 is over 20 MB");
    expect(apiErrorText(tooLarge, t("en"))).toBe("timelapse.mp4 is over 20 MB.");
    expect(apiErrorText(tooLarge, t("fr"))).toBe("timelapse.mp4 dépasse 20\u00a0Mo.");
    expect(apiErrorText(tooLarge, t("mg"))).toBe("Mihoatra ny 20 MB ny rakitra timelapse.mp4.");

    const empty = new ApiError(400, "empty_file", "sketch-2.jpg is empty");
    expect(apiErrorText(empty, t("en"))).toBe("sketch-2.jpg is empty. Choose another one.");
    expect(apiErrorText(empty, t("fr"))).toBe("sketch-2.jpg est vide. Choisissez-en un autre.");
    expect(apiErrorText(empty, t("mg"))).toBe("Foana ny rakitra sketch-2.jpg. Misafidiana hafa.");

    const unsupported = new ApiError(400, "unsupported_file", "IMG_0042.MOV: type video/quicktime is not accepted");
    expect(apiErrorText(unsupported, t("en"))).toBe("IMG_0042.MOV: this type of file is not accepted.");
    expect(apiErrorText(unsupported, t("fr"))).toBe("IMG_0042.MOV\u00a0: ce type de fichier n’est pas accepté.");
    expect(apiErrorText(unsupported, t("mg"))).toBe("IMG_0042.MOV: tsy ekena io karazana rakitra io.");
  });

  it("keeps a file name whole, whatever it contains", () => {
    expect(apiErrorText(new ApiError(400, "empty_file", "what is empty is over 3 MB {file} $1.jpg is empty"), t("en"))).toBe(
      "what is empty is over 3 MB {file} $1.jpg is empty. Choose another one.",
    );
    expect(apiErrorText(new ApiError(400, "unsupported_file", "a: type b.txt: type text/plain; charset=utf-8 is not accepted"), t("en"))).toBe(
      "a: type b.txt: this type of file is not accepted.",
    );
  });

  it.each([
    ["file_too_large", "None is over 20 MB", "api.file_too_large"],
    ["file_too_large", "The upload is too large", "api.file_too_large"],
    ["file_too_large", "timelapse.mp4 is over 20 MB\nand more", "api.file_too_large"],
    ["empty_file", "None is empty", "api.empty_file"],
    ["empty_file", " is empty", "api.empty_file"],
    ["unsupported_file", "None: type None is not accepted", "api.unsupported_file"],
    ["unsupported_file", "unsupported_file", "api.unsupported_file"],
  ] as const)("keeps the sentence without a name for %s when the message names no file (%j)", (code, message, key) => {
    for (const locale of LOCALES) expect(apiErrorText(new ApiError(400, code, message), t(locale))).toBe(dictionaries[locale][key]);
  });

  it("does not look for a file name under another code", () => {
    expect(apiErrorText(failure("duplicate_work", "sobika.jpg is empty"), t("en"))).toBe(dictionaries.en["api.duplicate_work"]);
    expect(apiErrorText(failure("something_new", "sobika.jpg is empty"), t("en"))).toBe("sobika.jpg is empty");
  });

  it.each(LOCALES)("does not blame an expired session in %s for a token the API refuses", (locale) => {
    // callWithToken has already renewed the token once: what reaches a screen is a fresh token refused, which a
    // session that ended cannot explain (that one is `unauthorized`).
    const text = apiErrorText(new ApiError(401, "invalid_token", "Invalid token: JWKS unreachable: ConnectTimeout"), t(locale));
    expect(text).toBe(dictionaries[locale]["api.invalid_token"]);
    expect(text).not.toMatch(/expire|expiré|lany daty/i);
  });

  it.each(ANDROID_CODES)("leaves the Android capture code %s to the API's message", (code) => {
    expect(apiErrorKey(code)).toBeUndefined();
    expect(apiErrorText(failure(code), t("fr"))).toBe("The API's own message");
  });

  it.each(LOCALES)("says in %s that the service did not answer, without naming the product", (locale) => {
    const text = apiErrorText(new ApiError(0, "unreachable", "unreachable"), t(locale));
    expect(text).toBe(dictionaries[locale]["api.unreachable"]);
    expect(text).not.toMatch(/artiko/i);
    expect(text).not.toBe("unreachable");
  });

  it.each(LOCALES)("says in %s to sign in when there is no token", (locale) => {
    // What getApiToken raises when Better Auth gives no token.
    const text = apiErrorText(new ApiError(401, "unauthorized", "unauthorized"), t(locale));
    expect(text).toBe(dictionaries[locale]["api.unauthorized"]);
    expect(text).not.toBe("unauthorized");
  });
});
