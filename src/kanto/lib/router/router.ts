import { useSyncExternalStore } from 'react';

/*
 * A minimal router on the History API. The app has a handful of routes, so the
 * platform covers deep links and the back button without a routing dependency.
 */

type Listener = () => void;

const listeners = new Set<Listener>();

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: Listener): () => void {
  if (listeners.size === 0) {
    window.addEventListener('popstate', notify);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.removeEventListener('popstate', notify);
    }
  };
}

function getPath(): string {
  return window.location.pathname;
}

export interface NavigateOptions {
  replace?: boolean | undefined;
}

/**
 * Addresses served by the Next app outside KANTO (accounts, my space, the
 * pages of the API). KANTO cannot draw them: they need a full page load.
 */
const APP_ROUTES = [
  '/sign-in',
  '/sign-up',
  '/forgot-password',
  '/reset-password',
  '/me',
  '/explore',
  '/hall-of-fame',
  '/heritage',
  '/scan',
  '/works',
  '/artists',
  '/expositions',
  '/api',
];

/** A full page load; replaceable in tests, where jsdom cannot load another document. */
export const pageLoad = {
  go(path: string, replace: boolean): void {
    if (replace) {
      window.location.replace(path);
    } else {
      window.location.assign(path);
    }
  },
};

export function isAppRoute(path: string): boolean {
  const pathname = path.split(/[?#]/, 1)[0] ?? path;
  return APP_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function navigate(path: string, options: NavigateOptions = {}): void {
  if (isAppRoute(path)) {
    pageLoad.go(path, options.replace === true);
    return;
  }
  if (options.replace === true) {
    window.history.replaceState(null, '', path);
  } else if (path !== window.location.pathname) {
    window.history.pushState(null, '', path);
  }
  notify();
}

export function useLocationPath(): string {
  return useSyncExternalStore(subscribe, getPath, () => '/');
}
