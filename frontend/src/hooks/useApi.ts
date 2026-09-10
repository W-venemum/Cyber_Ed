import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../api/client";

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * Runs an async loader and tracks loading/error state.
 * `deps` controls when the loader re-runs (like useEffect deps).
 */
export function useApi<T>(
  loader: () => Promise<T>,
  deps: unknown[] = [],
): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memoLoader = useCallback(loader, deps);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    memoLoader()
      .then((result) => {
        if (active) setData(result);
      })
      .catch((err: unknown) => {
        if (!active) return;
        const message =
          err instanceof ApiError
            ? err.message
            : (err as Error)?.message ?? "Unexpected error";
        setError(message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [memoLoader, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return { data, loading, error, reload };
}
