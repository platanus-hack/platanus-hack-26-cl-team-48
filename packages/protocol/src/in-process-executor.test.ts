import { describe, expect, it } from "vitest";
import { toExecutorPort, type InProcessExecutor } from "./in-process-executor.ts";

const hello = { executor: "fake", runtimes: ["sql" as const] };

describe("toExecutorPort", () => {
  it("routes each request to the handler of its method", async () => {
    const executor = {
      handlers: { "exec.hello": () => Promise.resolve(hello) },
      onLog: () => () => undefined,
    } as unknown as InProcessExecutor;

    await expect(toExecutorPort(executor).request("exec.hello", {})).resolves.toEqual(hello);
  });
});
