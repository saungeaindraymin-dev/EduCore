"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api/client";

type QueryState<T> = { key: string; data?: T; error?: string };

/**
 * Runs `fetcher` whenever `key` changes or `reload()` is called.
 * Keeps the previous data while a new request is in flight so tables don't flash empty.
 */
export function useApiQuery<T>(key: string, fetcher: () => Promise<T>) {
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const [version, setVersion] = useState(0);
  const [state, setState] = useState<QueryState<T> | null>(null);
  const requestKey = `${key}#${version}`;

  useEffect(() => {
    let cancelled = false;
    fetcherRef
      .current()
      .then((data) => {
        if (!cancelled) setState({ key: requestKey, data });
      })
      .catch((err) => {
        if (cancelled) return;
        setState((prev) => ({
          key: requestKey,
          data: prev?.data,
          error: err instanceof ApiError ? err.message : "Something went wrong",
        }));
      });
    return () => {
      cancelled = true;
    };
  }, [requestKey]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  return {
    data: state?.data,
    error: state?.key === requestKey ? state.error : undefined,
    isLoading: state?.key !== requestKey,
    reload,
  };
}
