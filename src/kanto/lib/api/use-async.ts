import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

export type AsyncStatus = 'loading' | 'ready' | 'error';

export interface AsyncState<T> {
  status: AsyncStatus;
  data: T | null;
  error: unknown;
  /** Runs the loader again, keeping the current data while it loads. */
  reload: () => void;
  /** Replaces the data locally, for example after a mutation returned it. */
  setData: (data: T) => void;
}

/**
 * Loads data for a key. The loader is read from a ref, so callers pass an
 * inline function and the effect only depends on the key and the reload
 * counter. Pass `pollMs` to reload on an interval while the page is shown.
 */
export function useAsync<T>(
  key: string,
  load: () => Promise<T>,
  pollMs: number | null = null,
): AsyncState<T> {
  const loadRef = useRef(load);
  // Layout effects run before the loading effect below reads the loader.
  useLayoutEffect(() => {
    loadRef.current = load;
  });
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<{
    status: AsyncStatus;
    data: T | null;
    error: unknown;
  }>({ status: 'loading', data: null, error: null });

  // A new key or a reload shows as loading from its first render, with the
  // current data kept until the loader answers.
  const [request, setRequest] = useState({ key, version });
  if (request.key !== key || request.version !== version) {
    setRequest({ key, version });
    setState((previous) => ({ ...previous, status: 'loading', error: null }));
  }

  useEffect(() => {
    let cancelled = false;
    loadRef.current().then(
      (data) => {
        if (!cancelled) {
          setState({ status: 'ready', data, error: null });
        }
      },
      (error: unknown) => {
        if (!cancelled) {
          setState((previous) => ({ ...previous, status: 'error', error }));
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [key, version]);

  useEffect(() => {
    if (pollMs === null) {
      return;
    }
    const timer = window.setInterval(() => {
      setVersion((value) => value + 1);
    }, pollMs);
    return () => {
      window.clearInterval(timer);
    };
  }, [pollMs, key]);

  const reload = useCallback(() => {
    setVersion((value) => value + 1);
  }, []);
  const setData = useCallback((data: T) => {
    setState({ status: 'ready', data, error: null });
  }, []);

  return { ...state, reload, setData };
}
