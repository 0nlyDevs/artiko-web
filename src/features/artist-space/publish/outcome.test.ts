import { describe, expect, it } from "vitest";
import { en } from "@/i18n/en";
import { fr } from "@/i18n/fr";
import { format, type Vars } from "@/i18n/locales";
import type { Key } from "@/i18n/en";
import { ApiError, type Work } from "@/lib/api";
import { failedOutcome, publishedOutcome, publishErrorText } from "./outcome";

const tEn = (key: Key, vars?: Vars) => format(en[key], vars);
const tFr = (key: Key, vars?: Vars) => format(fr[key], vars);
const said = (error: ApiError | null) => publishErrorText(error, tEn);

describe("where a publication leads", () => {
  it("201: the confirmation, with the work of the answer", () => {
    const work = { id: "w1", title: "Sobika" } as Work;

    expect(publishedOutcome(work)).toEqual({ view: "done", work });
  });

  it("409 possible_copy: the refusal screen with the case of the error", () => {
    const error = new ApiError(409, "possible_copy", "Too close to a known work", "7c2e41b8-0f3a-4d19-9b2e-51c0a8d3e7f4");

    expect(failedOutcome(error)).toEqual({ view: "refused", caseId: "7c2e41b8-0f3a-4d19-9b2e-51c0a8d3e7f4" });
  });

  it("409 possible_copy without a case still leads to the refusal screen", () => {
    expect(failedOutcome(new ApiError(409, "possible_copy", "Too close"))).toEqual({ view: "refused", caseId: null });
  });

  it.each([
    [409, "duplicate_work", "This exact file is already published on KANTO."],
    [413, "file_too_large", "A file is over the size limit."],
    [422, "invalid_request", "Something sent was not valid. Check what you entered, then try again."],
    [429, "rate_limited", "Too many attempts. Wait a minute, then try again."],
    [400, "invalid_exposition", "Choose one of your own expositions."],
    [400, "too_many_proofs", "A work takes 5 proof files at most."],
    [400, "unsupported_file", "This type of file is not accepted."],
    [401, "invalid_token", "Your session has expired. Sign in again."],
    [500, "internal_error", "Something went wrong on our side. Try again in a moment."],
    [0, "unreachable", "The service did not answer. Check your connection, then try again."],
  ])("%i %s stays on the form, with its sentence under the button", (status, code, sentence) => {
    const error = new ApiError(status, code, "the API's own English message");

    const outcome = failedOutcome(error);

    expect(outcome).toEqual({ view: "form", error, profile: false });
    expect(said(error)).toBe(sentence);
  });

  it("403 not_an_artist stays on the form and asks for the artist profile", () => {
    const error = new ApiError(403, "not_an_artist", "Create your artist profile first (PUT /me/artist)");

    expect(failedOutcome(error)).toEqual({ view: "form", error, profile: true });
    expect(said(error)).toBe("Create your artist profile first.");
  });

  it("a failure that is not an API answer stays on the form with the generic sentence", () => {
    expect(failedOutcome(new TypeError("Failed to fetch"))).toEqual({ view: "form", error: null, profile: false });
    expect(said(null)).toBe("The work was not published. Check your connection and try again.");
  });

  it("429 says how long to wait when the API gives Retry-After", () => {
    const error = new ApiError(429, "rate_limited", "Too many requests", null, 30);

    expect(said(error)).toBe("Too many attempts: try again in 30 seconds.");
    expect(publishErrorText(error, tFr)).toBe("Trop de tentatives : réessayez dans 30 secondes.");
  });

  it("a code without a sentence keeps the message of the API", () => {
    expect(said(new ApiError(400, "capture_too_old", "The capture is older than 10 minutes"))).toBe("The capture is older than 10 minutes");
  });
});
