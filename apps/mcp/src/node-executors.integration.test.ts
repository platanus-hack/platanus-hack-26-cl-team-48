import { readFile } from "node:fs/promises";
import { coreNodes, sampleDatasets } from "@nodomics/nodes-core";
import type { Flow } from "@nodomics/protocol";
import { describe, expect, it } from "vitest";
import { createEngineRunner } from "./engine-runner.ts";
import { createNodeExecutors } from "./node-executors.ts";
import { unwrap } from "./testing/runner-fixtures.ts";

const FLOW: Flow = {
  format: "nodomics/flow@0",
  nodes: [
    {
      id: "source",
      type: "core.source.sample",
      version: "0.1.0",
      params: { dataset: "ventas" },
      position: { x: 0, y: 0 },
    },
    {
      id: "limit",
      type: "core.limit",
      version: "0.1.0",
      params: { n: 3 },
      position: { x: 240, y: 0 },
    },
  ],
  edges: [
    {
      id: "source-limit",
      from: { node: "source", port: "out" },
      to: { node: "limit", port: "in" },
    },
  ],
};

describe("Node execution", () => {
  it("runs a real sample source and SQL transform with DuckDB in Node", async () => {
    const sampleSource = sampleDatasets["sample.ventas"];
    if (sampleSource === undefined) throw new Error("Missing sales sample");
    const runner = createEngineRunner({
      createExecutors: createNodeExecutors({ withPython: false }),
      catalog: coreNodes,
      presetSources: {
        "sample.ventas": {
          format: sampleSource.format,
          location: { kind: "bytes", bytes: await readFile(new URL(sampleSource.url)) },
        },
      },
    });

    const run = unwrap(await runner.run(FLOW));
    const sample = unwrap(await runner.sample(FLOW, { nodeId: "limit", port: "out", page: 0 }));

    expect(run.nodes).toEqual([
      { nodeId: "source", status: "ok", error: null },
      { nodeId: "limit", status: "ok", error: null },
    ]);
    expect(sample.rows).toHaveLength(3);
    expect(sample.schema.columns.length).toBeGreaterThan(0);
    expect(sample.hasMore).toBe(false);
  }, 30_000);
});
