import { ok } from "@nodomics/protocol";
import { useCallback } from "react";
import { useQuery } from "../async/use-query.ts";
import { useHub } from "./hub-context.ts";
import { matching } from "./hub-filters.ts";
import type { HubFilterState } from "./HubFilters.tsx";
import { useSearch, type Listed } from "./PublicationResults.tsx";

/** What the chosen view lists before the tags narrow it. */
export function useListed({
  filters,
  text,
  handle,
}: {
  readonly filters: HubFilterState;
  readonly text: string;
  readonly handle: string | undefined;
}): Listed {
  const isMine = filters.view === "mine";
  const searched = useSearch(text, filters.kind);
  const mine = useOwnPublications(isMine ? handle : undefined);
  if (!isMine) return searched;
  return mine.status === "ready"
    ? { status: "ready", value: matching(mine.value, { text, kind: filters.kind }) }
    : mine;
}

/** Asks the hub only for someone's publications: none while signed out or in another view. */
function useOwnPublications(handle: string | undefined) {
  const hub = useHub();
  const ask = useCallback(
    () => (handle === undefined ? Promise.resolve(ok([])) : hub.publicationsOf(handle)),
    [hub, handle],
  );
  return useQuery(ask);
}
