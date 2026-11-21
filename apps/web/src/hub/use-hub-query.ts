import type { HubResult } from "@nodomics/hub";
import { useEffect, useState } from "react";

export type HubQuery<T> =
  | { readonly status: "loading" }
  | { readonly status: "failed" }
  | { readonly status: "ready"; readonly value: T };

/**
 * The answer of a hub read, asked again whenever `ask` changes (memoize it with `useCallback`);
 * answers that arrive after a newer question are dropped.
 */
export function useHubQuery<T>(ask: () => Promise<HubResult<T>>, delay = 0): HubQuery<T> {
  const [query, setQuery] = useState<HubQuery<T>>({ status: "loading" });
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

const toQuery = <T>(result: HubResult<T>): HubQuery<T> =>
  result.ok ? { status: "ready", value: result.value } : { status: "failed" };
