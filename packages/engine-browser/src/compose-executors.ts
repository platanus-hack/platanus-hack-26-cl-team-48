import type { ExecutorPort } from "@nodomics/protocol";
import type { EngineConfig } from "./engine-config.ts";

type ExecutorFactories = {
  readonly browser: () => Promise<ReadonlyArray<ExecutorPort>>;
  readonly local: (url: string) => ExecutorPort;
};

export function composeExecutors(
  config: EngineConfig,
  factories: ExecutorFactories,
): Promise<ReadonlyArray<ExecutorPort>> {
  return config.mode === "browser"
    ? factories.browser()
    : Promise.resolve([factories.local(config.url)]);
}
