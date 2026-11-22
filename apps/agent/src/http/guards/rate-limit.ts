export type RateLimiterOptions = {
  readonly perMinute?: number;
  readonly clock?: () => number;
};

export type RateLimiter = {
  readonly check: (userId: string) => boolean;
  readonly isAllowed: (userId: string) => boolean;
};

export const REQUESTS_PER_MINUTE = 6;
export const ROUTES_PER_MINUTE = 60;
const WINDOW_MS = 60_000;
const MAX_TRACKED_USERS = 100;

function pruneExpired(timestamps: Map<string, readonly number[]>, cutoff: number): void {
  for (const [user, history] of timestamps.entries()) {
    if (history.every((time) => time <= cutoff)) {
      timestamps.delete(user);
    }
  }
}

export function createRateLimiter(options: RateLimiterOptions = {}): RateLimiter {
  const perMinute = options.perMinute ?? REQUESTS_PER_MINUTE;
  const clock = options.clock ?? Date.now;
  const timestamps = new Map<string, readonly number[]>();

  const check = (userId: string): boolean => {
    const now = clock();
    const cutoff = now - WINDOW_MS;
    if (timestamps.size > MAX_TRACKED_USERS) pruneExpired(timestamps, cutoff);
    const history = (timestamps.get(userId) ?? []).filter((time) => time > cutoff);
    if (history.length >= perMinute) return false;
    timestamps.set(userId, [...history, now]);
    return true;
  };

  return { check, isAllowed: check };
}
