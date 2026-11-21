export function createDeferred() {
  const completion: { resolve: () => void } = { resolve: () => undefined };
  const promise = new Promise<void>((resolve) => {
    completion.resolve = resolve;
  });
  return {
    promise,
    resolve: () => {
      completion.resolve();
    },
  };
}
