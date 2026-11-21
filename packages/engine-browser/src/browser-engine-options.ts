import type { Fetch } from "@nodomics/coordinator";
import type { ExecutorPort } from "@nodomics/protocol";
import type { EngineConfig } from "./engine-config.ts";

export type BrowserEngineOptions = {
  readonly executors: ReadonlyArray<ExecutorPort>;
  readonly config: EngineConfig;
  /** How API sources are asked for; the worker passes its own `fetch`. */
  readonly fetch?: Fetch;
};
