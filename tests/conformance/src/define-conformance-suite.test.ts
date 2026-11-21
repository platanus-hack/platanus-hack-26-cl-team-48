import { createMemoryTransportPair } from "@nodomics/client";
import { createPeer } from "@nodomics/rpc";
import { beforeEach, expect } from "vitest";
import { coreNodes } from "@nodomics/nodes-core";
import { defineConformanceSuite } from "./define-conformance-suite.ts";
import { parseTable } from "./parse-table.ts";
import { readCases } from "./read-cases.ts";

const selected = readCases().find(({ manifest }) => manifest.id === "core.source.csv");
if (!selected) throw new Error("Missing CSV case");
const testCase = selected.testCase;

beforeEach(({ task }) => {
  for (const registered of task.suite?.tasks ?? []) {
    if (registered.type === "test")
      expect(registered.timeout).toBe(task.suite?.name.includes("custom") ? 12000 : 30000);
  }
});

for (const runTimeoutMs of [undefined, 12000])
  defineConformanceSuite({
    ...(runTimeoutMs === undefined ? {} : { runTimeoutMs }),
    name: runTimeoutMs === undefined ? "conformance default timeout" : "conformance custom timeout",
    skip: [
      ...coreNodes.filter((node) => node.id !== "core.source.csv").map((node) => node.id),
      "reference:ventas-filter-group",
      "reference:source-zscore",
      "reference:subflow-filter-group",
    ],
    startEngine: () => {
      const [client, server] = createMemoryTransportPair();
      const peer = createPeer(server);
      peer.handle("engine.hello", () => ({
        protocol: "0.1",
        engine: "mock",
        runtimes: ["sql"],
        sources: ["upload"],
      }));
      peer.handle("nodes.register", () => ({}));
      peer.handle("source.add", () => ({ sourceId: "actual-source", name: "ventas.csv" }));
      peer.handle("flow.set", (params) => {
        expect(params).toHaveProperty("flow.nodes.0.params.sourceId", "actual-source");
        return { rev: 1, stale: [], errors: [] };
      });
      peer.handle("flow.run", () => {
        peer.notify("node.result", {
          rev: 1,
          runId: "run",
          nodeId: "subject",
          port: "out",
          ref: { id: "ref", rowCount: 3, schema: [] },
        });
        peer.notify("run.finished", {
          rev: 1,
          runId: "run",
          status: "done",
          durationMs: 0,
          executed: ["subject"],
          cached: [],
        });
        return { runId: "run" };
      });
      peer.handle("data.page", () => ({ ...parseTable(testCase.expected["out"]), total: 3 }));
      return client;
    },
  });
