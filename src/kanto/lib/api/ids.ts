function fallbackId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** A UUID when the platform provides one, otherwise a time-based id. */
export function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return fallbackId();
  }
}

/** Small deterministic hash, for stable demo values. */
export function hashString(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function nowIso(): string {
  return new Date().toISOString();
}
