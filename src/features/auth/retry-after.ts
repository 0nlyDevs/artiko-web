import { useEffect, useState } from "react";

/** Better Auth never asks to wait longer than its longest window; a larger number is not a countdown. */
const MAX_SECONDS = 3600;

type Answer = { status: number; headers: Pick<Headers, "get"> };

/** The seconds a 429 of Better Auth asks to wait (`X-Retry-After`, else the standard `Retry-After`), or null. */
export function retryAfterSeconds(response: Answer | null | undefined): number | null {
  if (!response || response.status !== 429) return null;
  const raw = response.headers.get("X-Retry-After") ?? response.headers.get("Retry-After");
  const seconds = raw === null ? NaN : Number(raw);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return Math.min(Math.ceil(seconds), MAX_SECONDS);
}

export interface RetryAfter {
  /** Seconds left before a new attempt; 0 once the wait is over; null when no wait was ever asked. */
  left: number | null;
  /** True while the form must not be sent. */
  waiting: boolean;
  /** Pass as `fetchOptions` of a Better Auth call: it reads the wait from a 429. */
  fetchOptions: { onError: (context: { response: Answer }) => void };
}

/** Counts down the wait a rate-limited answer asks for, one second at a time. */
export function useRetryAfter(): RetryAfter {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!left) return;
    const timer = window.setTimeout(() => setLeft((seconds) => (seconds ? seconds - 1 : seconds)), 1000);
    return () => window.clearTimeout(timer);
  }, [left]);
  return {
    left,
    waiting: left !== null && left > 0,
    fetchOptions: {
      onError(context) {
        const seconds = retryAfterSeconds(context.response);
        if (seconds !== null) setLeft(seconds);
      },
    },
  };
}
