import type { Key } from "@/i18n/en";
import type { ApiError, ScanResult } from "@/lib/api";
import { apiErrorKey } from "@/lib/api-messages";
import type { BadgeState } from "@/lib/ui/kanto";

/** The largest photo the API reads: 5 MB (`scan_max_upload_mb` of artiko-api), that is 5 242 880 bytes. */
export const SCAN_MAX_BYTES = 5 * 1024 * 1024;

/** What the file picker offers. The API itself accepts any picture it can open. */
export const SCAN_ACCEPT = "image/jpeg,image/png,image/webp";

/** The API's own codes for a file it refuses: the same refusal, said before anything is sent. */
export type FileRefusal = "not_an_image" | "empty_file" | "file_too_large";

/**
 * Why a file must not be sent, or null when it may go. Only a type the browser knows and that is not a
 * picture is refused here: without a type, the API decides.
 */
export function refuseFile(file: Pick<File, "size" | "type">): FileRefusal | null {
  if (file.type && !file.type.startsWith("image/")) return "not_an_image";
  if (file.size === 0) return "empty_file";
  return file.size > SCAN_MAX_BYTES ? "file_too_large" : null;
}

/** The text of a refusal, local or from the API: the size limit of the scan is said in its own words. */
export function scanErrorKey(code: string): Key | undefined {
  return code === "file_too_large" ? "scan.tooLarge" : apiErrorKey(code);
}

/** The window of the API's limiter: the wait when a 429 does not say how long (`Retry-After` unreadable across origins). */
export const DEFAULT_WAIT = 60;

/** A longer wait than this is not a countdown. */
const MAX_WAIT = 3600;

/** The seconds to wait after a rate-limited answer: the API's own figure when it is known, 60 otherwise. Null for any other failure. */
export function retryWait(error: Pick<ApiError, "status" | "code" | "retryAfter"> | null): number | null {
  if (!error || (error.status !== 429 && error.code !== "rate_limited")) return null;
  const seconds = error.retryAfter;
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) return DEFAULT_WAIT;
  return Math.min(Math.max(1, Math.ceil(seconds)), MAX_WAIT);
}

/** Whole seconds left before `deadline`, never below zero. Both are milliseconds since the epoch. */
export const secondsLeft = (deadline: number, now: number): number => Math.max(0, Math.ceil((deadline - now) / 1000));

/** True when sending the same photo again can succeed: no answer, a busy service, or a wait that is over. */
export function canRetry(error: Pick<ApiError, "status"> | null): boolean {
  return error === null || error.status === 0 || error.status === 429 || error.status >= 500;
}

/**
 * The label of each verdict. « Not found » wears the neutral label, never the colours of a warning or an
 * error: an unknown photo is not a fake. Only Content Credentials that name an AI tool get the AI label.
 */
export const VERDICT_BADGE: Record<ScanResult["status"], BadgeState> = {
  human_proven: "human",
  artiko_work: "none",
  known_work: "none",
  ai_made: "ai",
  unknown: "none",
};

/** A source is a link only when it is a web address. */
export const isWebLink = (url: string): boolean => /^https?:\/\//i.test(url);
