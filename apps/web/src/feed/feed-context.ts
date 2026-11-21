import { createContext, useContext } from "react";
import type { FeedService } from "./feed-service.ts";

/** The Feed of this app instance (ADR 0022), injected by the composition root. */
export const FeedContext = createContext<FeedService | undefined>(undefined);

export function useFeed(): FeedService {
  const feed = useContext(FeedContext);
  if (feed === undefined) throw new Error("useFeed must be used inside a FeedContext provider");
  return feed;
}

/** For pages that can render without the Feed: it is only mounted by the composition root. */
export function useOptionalFeed(): FeedService | undefined {
  return useContext(FeedContext);
}
