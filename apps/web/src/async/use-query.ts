import type { Result } from "@nodomics/protocol";
import { useEffect, useState } from "react";

export type Query<T, E> =
  | { readonly status: "loading" }
  | { readonly status: "failed"; readonly error: E }
  | { readonly status: "ready"; readonly value: T };

/**
 * The answer of an async read, asked again whenever `ask` changes (memoize it with `useCallback`);
 * answers that arrive after a newer question are dropped.
 */
export function useQuery<T, E>(ask: () => Promise<Result<T, E>>, delay = 0): Query<T, E> {
  const [query, setQuery] = useState<Query<T, E>>({ status: "loading" });
  useEffect(() => {
    let isCurrent = true;
    const timer = setTimeout(() => {
      void ask().then((result) => {
        if (isCurrent) setQuery(toQuery(result));
      });
    }, delay);
    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [ask, delay]);
  return query;
}

const toQuery = <T, E>(result: Result<T, E>): Query<T, E> =>
  result.ok ? { status: "ready", value: result.value } : { status: "failed", error: result.error };
