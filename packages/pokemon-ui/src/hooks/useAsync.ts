import { useCallback, useEffect, useState, type DependencyList } from 'react';

interface AsyncState<T> {
  data: T | null;
  error: unknown;
  loading: boolean;
}

// Everything else in hooks/ composes this. `deps` follows useEffect/useCallback rules.
export function useAsync<T>(fn: () => Promise<T>, deps: DependencyList) {
  const [state, setState] = useState<AsyncState<T>>({ data: null, error: null, loading: true });

  const refetch = useCallback(() => {
    let cancelled = false;
    // eslint-disable-next-line @eslint-react/hooks-extra/no-direct-set-state-in-use-effect -- cancellable fetch-in-effect, no data-fetching lib per docs/PLAN.md
    setState((s) => ({ ...s, loading: true, error: null }));
    fn()
      .then((data) => {
        if (!cancelled) setState({ data, error: null, loading: false });
      })
      .catch((error: unknown) => {
        // eslint-disable-next-line @eslint-react/hooks-extra/no-direct-set-state-in-use-effect
        if (!cancelled) setState({ data: null, error, loading: false });
      });
    return () => {
      cancelled = true;
    };
  }, deps);

  useEffect(() => refetch(), [refetch]);

  return { ...state, refetch };
}
