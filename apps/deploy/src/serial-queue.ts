export type SerialQueue = <T>(task: () => Promise<T>) => Promise<T>;

/** Runs the tasks it is given one after another, in the order they arrive. */
export function createSerialQueue(): SerialQueue {
  let tail: Promise<unknown> = Promise.resolve();
  return (task) => {
    const run = tail.then(task, task);
    tail = run.catch(() => undefined);
    return run;
  };
}
