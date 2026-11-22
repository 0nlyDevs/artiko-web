import type { Item, Permission, ScanSession } from '../types';

export interface MockAccount {
  accountId: string;
  email: string;
  displayName: string;
  permissions: Permission[];
  /** Demo only: the mock keeps the password in clear in this browser. */
  password: string;
}

export interface MockState {
  version: 1;
  accounts: MockAccount[];
  sessionAccountId: string | null;
  items: Item[];
  scans: ScanSession[];
  /** Deposit slip counter. */
  counter: number;
  /** Increments on every write, so another tab can pick up the latest state. */
  revision: number;
  /** Idempotency key of the last mint request per item. */
  mintKeys: Record<string, string>;
}

export const MOCK_STORAGE_KEY = 'kanto.mock.v1';

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

function isMockState(value: unknown): value is MockState {
  return (
    typeof value === 'object' &&
    value !== null &&
    'version' in value &&
    value.version === 1 &&
    'items' in value &&
    Array.isArray(value.items)
  );
}

export function loadMockState(): MockState | null {
  const raw = storage()?.getItem(MOCK_STORAGE_KEY) ?? null;
  if (raw === null) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return isMockState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveMockState(state: MockState): void {
  try {
    storage()?.setItem(MOCK_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota or private mode: the demo keeps running in memory.
  }
}

export function clearMockState(): void {
  storage()?.removeItem(MOCK_STORAGE_KEY);
}
