export const TIMED_OUT = Symbol("timed_out");

/** Resolves with TIMED_OUT once the deadline passes; a late result of `promise` is ignored. */
export function withDeadline<T>(
  promise: Promise<T>,
  deadlineAt: number,
): Promise<T | typeof TIMED_OUT> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => {
        resolve(TIMED_OUT);
      },
      Math.max(0, deadlineAt - Date.now()),
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (reason: unknown) => {
        clearTimeout(timer);
        reject(reason instanceof Error ? reason : new Error(String(reason)));
      },
    );
  });
}
