import { fileURLToPath, pathToFileURL } from "node:url";
import type { Flow, FlowNode } from "@nodomics/protocol";
import { build } from "vite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { unwrap } from "./testing/runner-fixtures.ts";
import { createWorkerRunner } from "./worker-runner.ts";

const BUILD_TIMEOUT_MS = 300_000;
const RUN_TIMEOUT_MS = 60_000;
const serviceRoot = fileURLToPath(new URL("..", import.meta.url));
// Its own output directory, so it does not race start.test.ts over dist/. It stays under
// apps/mcp/node_modules so the bundle still resolves its external packages.
const outDir = fileURLToPath(
  new URL("../node_modules/.cache/runner-worker-bundle/", import.meta.url),
);

const node = (id: string, type: string, params: Readonly<Record<string, unknown>>): FlowNode => ({
  id,
  type,
  version: "0.1.0",
  params: { ...params },
  position: { x: 0, y: 0 },
});

const flowFrom = (second: FlowNode): Flow => ({
  format: "nodomics/flow@0",
  nodes: [node("source", "core.source.sample", { dataset: "ventas" }), second],
  edges: [
    {
      id: `source-${second.id}`,
      from: { node: "source", port: "out" },
      to: { node: second.id, port: "in" },
    },
  ],
});

const LIMIT_FLOW = flowFrom(node("limit", "core.limit", { n: 3 }));
const PYTHON_FLOW = flowFrom(
  node("python", "core.python.custom", {
    code: 'def transform(inputs):\n    return {"out": inputs["in"]}\n',
  }),
);

describe("runner worker from the bundle", () => {
  let runner: ReturnType<typeof createWorkerRunner>;

  beforeAll(async () => {
    await build({
      root: serviceRoot,
      configFile: fileURLToPath(new URL("../vite.config.ts", import.meta.url)),
      logLevel: "silent",
      build: { outDir, emptyOutDir: true },
    });
    runner = createWorkerRunner({
      workerUrl: pathToFileURL(`${outDir}runner-worker.js`),
      timeoutMs: RUN_TIMEOUT_MS,
    });
  }, BUILD_TIMEOUT_MS);

  afterAll(async () => {
    await runner.close();
  });

  it(
    "runs a sample source and a SQL limit to ok",
    async () => {
      const result = await runner.run(LIMIT_FLOW);

      expect(unwrap(result).nodes).toEqual([
        { nodeId: "source", status: "ok", error: null },
        { nodeId: "limit", status: "ok", error: null },
      ]);
    },
    RUN_TIMEOUT_MS,
  );

  it(
    "samples rows from the limit output",
    async () => {
      const result = await runner.sample(LIMIT_FLOW, { nodeId: "limit", port: "out", page: 0 });

      expect(unwrap(result).rows).toHaveLength(3);
    },
    RUN_TIMEOUT_MS,
  );

  it(
    "marks a Python node as an error because Python is not available",
    async () => {
      const result = await runner.run(PYTHON_FLOW);

      const python = unwrap(result).nodes.find((run) => run.nodeId === "python");
      expect(python?.status).toBe("error");
      expect(python?.error).not.toBeNull();
    },
    RUN_TIMEOUT_MS,
  );
});
