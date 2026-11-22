import { coreNodes } from "@nodomics/nodes-core";
import type { Flow, NodeManifest } from "@nodomics/protocol";
import { describe, expect, it } from "vitest";
import { createEngineRunner } from "./engine-runner.ts";
import { createNodeExecutors } from "./node-executors.ts";
import { unwrap } from "./testing/runner-fixtures.ts";

const PYTHON_NODE: NodeManifest = {
  id: "code.python",
  version: "0.1.0",
  name: "Python rows",
  category: "Código",
  inputs: [],
  outputs: [{ id: "out", type: "table" }],
  params: { type: "object", properties: {} },
  impl: {
    kind: "python",
    code: [
      "import pandas as pd",
      "def run(inputs, params):",
      "    print('Running Python')",
      "    return {'out': pd.DataFrame({'n': [1, 2]})}",
    ].join("\n"),
    entry: "run",
  },
  requires: { runtime: "python", packages: ["pandas"] },
};

const FLOW: Flow = {
  format: "nodomics/flow@0",
  nodes: [
    { id: "py", type: "code.python", version: "0.1.0", params: {}, position: { x: 0, y: 0 } },
  ],
  edges: [],
  customNodes: [PYTHON_NODE],
};

describe("Node Python execution", () => {
  it("executes a custom Python node and exposes its real rows and logs", async () => {
    const runner = createEngineRunner({
      createExecutors: createNodeExecutors({ withPython: true }),
      catalog: coreNodes,
    });

    const run = unwrap(await runner.run(FLOW));
    const sample = unwrap(await runner.sample(FLOW, { nodeId: "py", port: "out", page: 0 }));
    const logs = unwrap(await runner.logs(FLOW, "py"));

    expect(run.nodes).toEqual([{ nodeId: "py", status: "ok", error: null }]);
    expect(sample.rows).toEqual([{ n: 1 }, { n: 2 }]);
    expect(sample.schema.columns).toContainEqual({ name: "n", type: "number" });
    expect(sample.hasMore).toBe(false);
    expect(logs.nodeId).toBe("py");
    expect(logs.lines.some((line) => line.includes("Running Python"))).toBe(true);
  }, 120_000);
});
