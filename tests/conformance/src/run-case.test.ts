import { describe, expect, it } from "vitest";
import { createEngineClient, createMemoryTransportPair } from "@nodomics/client";
import { startMockEngine } from "@nodomics/engine-mock";
import { coreNodes } from "@nodomics/nodes-core";
import { createPeer } from "@nodomics/rpc";
import { tableToCsv } from "./table-to-csv.ts";
import { runCase } from "./run-case.ts";

const manifest = coreNodes.find((node) => node.id === "core.limit");
if (!manifest) throw new Error("Missing limit manifest");
const testCase = {
  name: "pages",
  params: { n: 5 },
  inputs: { in: { columns: [{ name: "n", type: "number" as const }], rows: [[1]] } },
  expected: { out: { columns: [{ name: "n", type: "number" as const }], rows: [[1]] } },
};

describe("runCase", () => {
  it("connects, uploads, runs and reads pages through the mock NEP", async () => {
    const client = createEngineClient(startMockEngine());
    try {
      expect((await client.connect({ client: "conformance-smoke" })).ok).toBe(true);
      await client.request("nodes.register", { nodes: [...coreNodes] });
      const filter = coreNodes.find((node) => node.id === "core.filter");
      if (!filter) throw new Error("Missing filter manifest");
      const expected = {
        columns: [
          { name: "fecha", type: "date" as const },
          { name: "region", type: "text" as const },
          { name: "producto", type: "text" as const },
          { name: "unidades", type: "number" as const },
          { name: "precio", type: "number" as const },
        ],
        rows: [["2024-01-01", "Norte", "Café", 1, 5]],
      };
      const result = await runCase(client, filter, {
        ...testCase,
        params: { column: "unidades", op: "=", value: "1" },
        expected: { out: expected },
      });
      expect(result["out"]).toEqual(expected);
    } finally {
      client.close();
    }
  });
  it("captures early events, ignores unrelated runs and paginates by 1000", async () => {
    const [clientEnd, engineEnd] = createMemoryTransportPair();
    const peer = createPeer(engineEnd);
    const uploads: unknown[] = [];
    const offsets: number[] = [];
    peer.handle("source.add", (params) => {
      uploads.push(params);
      return { sourceId: "uploaded", name: "in.csv" };
    });
    peer.handle("flow.set", () => ({ rev: 1, stale: [], errors: [] }));
    peer.handle("flow.run", () => {
      peer.notify("run.finished", {
        rev: 0,
        runId: "other",
        status: "error",
        durationMs: 0,
        executed: [],
        cached: [],
      });
      peer.notify("node.result", {
        rev: 1,
        runId: "run",
        nodeId: "subject",
        port: "out",
        ref: { id: "ref", rowCount: 1001, schema: [{ name: "n", type: "number" }] },
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
    peer.handle("data.page", (params) => {
      const offset =
        typeof params === "object" && params !== null && "offset" in params
          ? Number(params.offset)
          : -1;
      offsets.push(offset);
      return {
        columns: [{ name: "n", type: "number" }],
        rows: Array.from({ length: offset === 0 ? 1000 : 1 }, () => [1]),
        total: 1001,
      };
    });
    const client = createEngineClient(clientEnd);
    try {
      const result = await runCase(client, manifest, {
        ...testCase,
        expected: { out: { ...testCase.inputs.in, rows: Array.from({ length: 1001 }, () => [1]) } },
      });
      expect(result["out"]).toHaveProperty("rows.length", 1001);
      expect(offsets).toEqual([0, 1000]);
      expect(uploads).toEqual([
        { kind: "upload", name: "in.csv", file: tableToCsv(testCase.inputs.in) },
      ]);
    } finally {
      client.close();
      peer.close();
    }
  });
});
