import { useEffect, useState } from "react";
import type { FeedError, FeedResult } from "./feed-service.ts";

export type FeedQuery<T> =
  | { readonly status: "loading" }
  | { readonly status: "failed"; readonly error: FeedError }
  | { readonly status: "ready"; readonly value: T };

/**
 * The answer of a Feed read, asked again whenever `ask` changes (memoize it with `useCallback`);
 * answers that arrive after a newer question are dropped.
 */
export function useFeedQuery<T>(ask: () => Promise<FeedResult<T>>, delay = 0): FeedQuery<T> {
  const [query, setQuery] = useState<FeedQuery<T>>({ status: "loading" });
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

const toQuery = <T>(result: FeedResult<T>): FeedQuery<T> =>
  result.ok ? { status: "ready", value: result.value } : { status: "failed", error: result.error };
