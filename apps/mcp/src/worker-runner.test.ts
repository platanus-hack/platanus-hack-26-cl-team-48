import { afterEach, describe, expect, it } from "vitest";
import { edge, flowNode, flowOf, unwrap } from "./testing/runner-fixtures.ts";
import { createWorkerRunner } from "./worker-runner.ts";

const ECHO_WORKER = new URL("./testing/echo-worker.mjs", import.meta.url);
const MISSING_WORKER = new URL("./testing/missing-worker.mjs", import.meta.url);
const GENEROUS_TIMEOUT_MS = 10_000;
const SHORT_TIMEOUT_MS = 300;
const TIMEOUT_MESSAGE = /timed out|tiempo/i;
const RESTART_MESSAGE = /restart|reinici/i;

const runners: ReturnType<typeof createWorkerRunner>[] = [];

afterEach(async () => {
  await Promise.all(runners.splice(0).map((runner) => runner.close()));
});

function startRunner(timeoutMs = GENEROUS_TIMEOUT_MS, workerUrl = ECHO_WORKER) {
  const runner = createWorkerRunner({ workerUrl, timeoutMs });
  runners.push(runner);
  return runner;
}

const flowNamed = (name: string) =>
  flowOf([flowNode("a", "test.rows"), flowNode("b", "test.filter")], [edge("a", "b")], name);

const threadOf = (lines: readonly string[]) => lines[0];

describe("createWorkerRunner", () => {
  describe("protocol", () => {
    it("returns the run result the worker answers", async () => {
      const runner = startRunner();

      const result = await runner.run(flowNamed("echo"));

      expect(result).toEqual({
        ok: true,
        value: {
          nodes: [
            { nodeId: "a", status: "ok", error: null },
            { nodeId: "b", status: "ok", error: null },
          ],
        },
      });
    });

    it("sends upTo to the worker with a run", async () => {
      const runner = startRunner();

      const result = await runner.run(flowNamed("echo"), ["a"]);

      expect(unwrap(result).nodes).toEqual([{ nodeId: "a", status: "ok", error: null }]);
    });

    it("returns the sample the worker answers for the requested port and page", async () => {
      const runner = startRunner();

      const result = await runner.sample(flowNamed("echo"), { nodeId: "b", port: "out", page: 2 });

      expect(result).toEqual({
        ok: true,
        value: {
          schema: { columns: [{ name: "port", type: "text" }] },
          rows: [{ nodeId: "b", port: "out" }],
          page: 2,
          hasMore: false,
        },
      });
    });

    it("returns the logs the worker answers for the requested node", async () => {
      const runner = startRunner();

      const result = await runner.logs(flowNamed("echo"), "b");

      expect(unwrap(result).nodeId).toBe("b");
      expect(unwrap(result).lines).toHaveLength(1);
    });

    it("returns an error result the worker answers as the same error", async () => {
      const runner = startRunner();

      const result = await runner.run(flowNamed("fail"));

      expect(result).toEqual({ ok: false, error: { message: "worker failed run" } });
    });

    it("reuses the same worker for later calls", async () => {
      const runner = startRunner();

      const first = unwrap(await runner.logs(flowNamed("echo"), "a"));
      const second = unwrap(await runner.logs(flowNamed("echo"), "a"));

      expect(threadOf(second.lines)).toBe(threadOf(first.lines));
    });
  });

  describe("concurrency", () => {
    it("delivers each answer to its own request when the worker answers out of order", async () => {
      const runner = startRunner();

      const held = runner.sample(flowNamed("hold"), { nodeId: "a", port: "out", page: 0 });
      const released = runner.sample(flowNamed("release"), { nodeId: "b", port: "out", page: 1 });
      const [heldResult, releasedResult] = await Promise.all([held, released]);

      expect(unwrap(heldResult).rows).toEqual([{ nodeId: "a", port: "out" }]);
      expect(unwrap(releasedResult).rows).toEqual([{ nodeId: "b", port: "out" }]);
    });

    it("delivers answers to concurrent calls of different methods", async () => {
      const runner = startRunner();

      const held = runner.run(flowNamed("hold"), ["a"]);
      const released = runner.logs(flowNamed("release"), "b");
      const [runResult, logsResult] = await Promise.all([held, released]);

      expect(unwrap(runResult).nodes).toEqual([{ nodeId: "a", status: "ok", error: null }]);
      expect(unwrap(logsResult).nodeId).toBe("b");
    });
  });

  describe("timeout", () => {
    it("returns a timeout error for a request that passes the limit", async () => {
      const runner = startRunner(SHORT_TIMEOUT_MS);

      const result = await runner.run(flowNamed("never"));

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.message).toMatch(TIMEOUT_MESSAGE);
    });

    it("returns a restart error for the other pending requests when one times out", async () => {
      const runner = startRunner(SHORT_TIMEOUT_MS);

      const timedOut = runner.run(flowNamed("never"));
      const pending = runner.logs(flowNamed("hold"), "a");
      const [, pendingResult] = await Promise.all([timedOut, pending]);

      expect(pendingResult.ok).toBe(false);
      if (!pendingResult.ok) expect(pendingResult.error.message).toMatch(RESTART_MESSAGE);
    });

    it("answers the next call with a new worker after a timeout", async () => {
      const runner = startRunner(SHORT_TIMEOUT_MS);
      const before = unwrap(await runner.logs(flowNamed("echo"), "a"));
      await runner.run(flowNamed("never"));

      const after = await runner.logs(flowNamed("echo"), "a");

      expect(after.ok).toBe(true);
      if (after.ok) expect(threadOf(after.value.lines)).not.toBe(threadOf(before.lines));
    });
  });

  describe("worker death", () => {
    it("returns errors for pending requests when the worker exits", async () => {
      const runner = startRunner();

      const pending = runner.run(flowNamed("hold"));
      const exiting = runner.run(flowNamed("exit"));
      const results = await Promise.all([pending, exiting]);

      expect(results.map((result) => result.ok)).toEqual([false, false]);
    });

    it("answers the next call with a new worker after the worker exits", async () => {
      const runner = startRunner();
      const before = unwrap(await runner.logs(flowNamed("echo"), "a"));
      await runner.run(flowNamed("exit"));

      const after = await runner.logs(flowNamed("echo"), "a");

      expect(after.ok).toBe(true);
      if (after.ok) expect(threadOf(after.value.lines)).not.toBe(threadOf(before.lines));
    });

    it("returns errors for pending requests when the worker throws", async () => {
      const runner = startRunner();

      const pending = runner.sample(flowNamed("hold"), { nodeId: "a", port: "out", page: 0 });
      const throwing = runner.run(flowNamed("throw"));
      const results = await Promise.all([pending, throwing]);

      expect(results.map((result) => result.ok)).toEqual([false, false]);
    });

    it("answers the next call after the worker throws", async () => {
      const runner = startRunner();
      await runner.run(flowNamed("throw"));

      const after = await runner.run(flowNamed("echo"), ["a"]);

      expect(unwrap(after).nodes).toEqual([{ nodeId: "a", status: "ok", error: null }]);
    });
  });

  describe("lazy start", () => {
    it("creates the runner without starting a missing worker script", () => {
      const create = () => startRunner(GENEROUS_TIMEOUT_MS, MISSING_WORKER);

      expect(create).not.toThrow();
    });

    it("returns an error instead of throwing when the worker script is missing", async () => {
      const runner = startRunner(GENEROUS_TIMEOUT_MS, MISSING_WORKER);

      const result = await runner.run(flowNamed("echo"));

      expect(result.ok).toBe(false);
    });
  });

  describe("close", () => {
    it("returns errors for calls after close", async () => {
      const runner = startRunner();
      unwrap(await runner.run(flowNamed("echo")));
      await runner.close();

      const results = await Promise.all([
        runner.run(flowNamed("echo")),
        runner.sample(flowNamed("echo"), { nodeId: "a", port: "out", page: 0 }),
        runner.logs(flowNamed("echo"), "a"),
      ]);

      expect(results.map((result) => result.ok)).toEqual([false, false, false]);
    });

    it("closes a runner that never started a worker", async () => {
      const runner = startRunner(GENEROUS_TIMEOUT_MS, MISSING_WORKER);

      await expect(runner.close()).resolves.toBeUndefined();
    });
  });
});
