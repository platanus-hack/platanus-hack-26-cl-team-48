import { createEngineClient, createMemoryTransportPair } from "@nodomics/client";
import { coreNodes } from "@nodomics/nodes-core";
import { createPeer } from "@nodomics/rpc";
import { expect, it } from "vitest";
import { runCase } from "./run-case.ts";
import { readTable } from "./read-table.ts";
import type { Table } from "./test-case.ts";

const expected: Table = { columns: [{ name: "n", type: "number" }], rows: [[3]] };

function createTableEngine(table: Table, total = table.rows.length) {
  const [clientEnd, engineEnd] = createMemoryTransportPair();
  const peer = createPeer(engineEnd);
  peer.handle("flow.set", () => ({ rev: 1, stale: [], errors: [] }));
  peer.handle("flow.run", () => {
    peer.notify("node.result", {
      rev: 1,
      runId: "run",
      nodeId: "subject",
      port: "out",
      ref: { id: "ref", rowCount: table.rows.length, schema: table.columns },
    });
    peer.notify("run.finished", {
      rev: 1,
      runId: "run",
      status: "done",
      durationMs: 0,
      executed: [],
      cached: [],
    });
    return { runId: "run" };
  });
  peer.handle("data.page", () => ({ ...table, total }));
  const client = createEngineClient(clientEnd);
  return {
    client,
    close: () => {
      client.close();
      peer.close();
    },
  };
}

it.each([
  { name: "extra row", table: { ...expected, rows: [[3], [3]] } },
  { name: "missing row", table: { ...expected, rows: [] } },
  { name: "changed value", table: { ...expected, rows: [[4]] } },
  { name: "changed type", table: { ...expected, columns: [{ name: "n", type: "text" as const }] } },
])("reports $name from an incorrect NEP engine", async ({ table }) => {
  const engine = createTableEngine(table);
  const manifest = coreNodes.find((node) => node.id === "core.limit");
  if (!manifest) throw new Error("Missing manifest");

  try {
    await expect(
      runCase(engine.client, manifest, {
        name: "incorrect result",
        params: { n: 1 },
        inputs: {},
        expected: { out: expected },
      }),
    ).rejects.toThrow(/rows|cell|column/);
  } finally {
    engine.close();
  }
});

it.each([0, 2])("rejects page total %i inconsistent with the result reference", async (total) => {
  const engine = createTableEngine(expected, total);

  try {
    await expect(
      readTable(engine.client, {
        id: "ref",
        rowCount: 1,
        schema: [...expected.columns],
      }),
    ).rejects.toThrow("Page total for ref: expected 1, got " + String(total));
  } finally {
    engine.close();
  }
});
