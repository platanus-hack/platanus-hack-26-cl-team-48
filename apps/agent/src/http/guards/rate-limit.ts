export type RateLimiterOptions = {
  readonly perMinute?: number;
  readonly clock?: () => number;
};

export type RateLimiter = {
  readonly check: (userId: string) => boolean;
  readonly isAllowed: (userId: string) => boolean;
};

const DEFAULT_PER_MINUTE = 6;
const WINDOW_MS = 60_000;

export function createRateLimiter(options: RateLimiterOptions = {}): RateLimiter {
  const perMinute = options.perMinute ?? DEFAULT_PER_MINUTE;
  const clock = options.clock ?? Date.now;
  const timestamps = new Map<string, readonly number[]>();

  const check = (userId: string): boolean => {
    const now = clock();
    const cutoff = now - WINDOW_MS;
    const history = (timestamps.get(userId) ?? []).filter((time) => time > cutoff);
    if (history.length >= perMinute) return false;
    timestamps.set(userId, [...history, now]);
    return true;
  };

  return { check, isAllowed: check };
}
