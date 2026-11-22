import { useSyncExternalStore } from 'react';
import { api } from '../api';
import type {
  Account,
  Credentials,
  Permission,
  RegistrationInput,
} from '../api/types';

export type SessionStatus = 'unknown' | 'loading' | 'guest' | 'signed-in';

export interface SessionState {
  status: SessionStatus;
  account: Account | null;
}

type Listener = () => void;

const INITIAL: SessionState = { status: 'unknown', account: null };
const listeners = new Set<Listener>();
let state: SessionState = INITIAL;
let loading: Promise<void> | null = null;

function setState(next: SessionState): void {
  state = next;
  for (const listener of listeners) {
    listener();
  }
}

function getState(): SessionState {
  return state;
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const session = {
  getState,
  subscribe,

  /** Asks the gateway who is signed in. Runs once; later calls reuse the result. */
  load(): Promise<void> {
    if (loading !== null) {
      return loading;
    }
    if (state.status === 'signed-in' || state.status === 'guest') {
      return Promise.resolve();
    }
    setState({ status: 'loading', account: null });
    loading = api.auth.me().then(
      (account) => {
        setState(
          account === null
            ? { status: 'guest', account: null }
            : { status: 'signed-in', account },
        );
      },
      () => {
        setState({ status: 'guest', account: null });
      },
    );
    return loading;
  },

  async signIn(credentials: Credentials): Promise<Account> {
    const account = await api.auth.login(credentials);
    setState({ status: 'signed-in', account });
    return account;
  },

  async register(input: RegistrationInput): Promise<void> {
    await api.auth.register(input);
  },

  async signOut(): Promise<void> {
    await api.auth.logout();
    setState({ status: 'guest', account: null });
  },

  /** Marks the session as gone after a 401, so screens send the visitor to sign in. */
  expire(): void {
    setState({ status: 'guest', account: null });
  },

  /** Forgets everything, for tests. */
  reset(): void {
    loading = null;
    setState(INITIAL);
  },
};

export function useSession(): SessionState {
  return useSyncExternalStore(subscribe, getState, () => INITIAL);
}

export function hasPermission(
  account: Account | null,
  permission: Permission,
): boolean {
  return (
    account !== null &&
    (account.permissions.includes(permission) ||
      account.permissions.includes('admin'))
  );
}
