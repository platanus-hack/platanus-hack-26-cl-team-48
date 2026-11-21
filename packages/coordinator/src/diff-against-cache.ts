import type { CacheKeys } from "./cache-keys.ts";

export type CacheDiff = { readonly stale: string[]; readonly cached: string[] };

export function diffAgainstCache(keys: CacheKeys, cache: { has(key: string): boolean }): CacheDiff {
  const nodeIds = [...keys.keys()];
  const isCached = (nodeId: string) => cache.has(keys.get(nodeId) ?? "");
  return {
    stale: nodeIds.filter((nodeId) => !isCached(nodeId)),
    cached: nodeIds.filter(isCached),
  };
}
