export type RateLimit = { readonly maxRequests: number; readonly windowMs: number };

/** Counts each key's requests in a fixed window that starts with its first request (ADR 0029 §3). */
export function createRateLimiter(
  limit: RateLimit,
  now: () => number,
): (key: string) => boolean {
  const windows = new Map<string, { readonly startedAt: number; readonly count: number }>();
  return (key) => {
    const current = windows.get(key);
    const window =
      current === undefined || now() - current.startedAt >= limit.windowMs
        ? { startedAt: now(), count: 1 }
        : { startedAt: current.startedAt, count: current.count + 1 };
    windows.set(key, window);
    return window.count <= limit.maxRequests;
  };
}
