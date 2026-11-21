/** A scheduler for tests: tasks wait until the test runs them, one at a time. */
export function createManualScheduler() {
  const tasks: (() => void)[] = [];
  return {
    schedule: (task: () => void) => {
      tasks.push(task);
    },
    runNext: () => {
      tasks.shift()?.();
    },
    runAll: () => {
      while (tasks.length > 0) tasks.shift()?.();
    },
  };
}
