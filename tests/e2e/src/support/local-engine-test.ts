import { test as base } from "@playwright/test";
import { startLocalEngine, type LocalEngine } from "./local-engine.ts";

// Above the engine's own startup timeout, so its clearer error is the one reported.
const FIXTURE_TIMEOUT_MS = 180_000;

/** `test` with a local Python engine shared by the tests of a worker, started on first use. */
export const test = base.extend<object, { readonly localEngine: LocalEngine }>({
  localEngine: [
    async ({}, use) => {
      const engine = await startLocalEngine();
      await use(engine);
      await engine.stop();
    },
    { scope: "worker", timeout: FIXTURE_TIMEOUT_MS },
  ],
});
