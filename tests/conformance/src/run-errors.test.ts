import { expect, it } from "vitest";
import { createEngineClient, createMemoryTransportPair } from "@nodomics/client";
import { createPeer } from "@nodomics/rpc";
import { coreNodes } from "@nodomics/nodes-core";
import { runCase } from "./run-case.ts";
import { readReferenceFlows } from "./read-reference-flows.ts";
import { runReferenceFlow } from "./run-reference-flow.ts";

it("reports a node error message and its detail from an early event", async () => {
  const [clientEnd, engineEnd] = createMemoryTransportPair();
  const peer = createPeer(engineEnd);
  peer.handle("flow.set", () => ({ rev: 1, stale: [], errors: [] }));
  peer.handle("flow.run", () => {
    peer.notify("node.status", {
      rev: 1,
      runId: "run",
      nodeId: "subject",
      state: "error",
      error: {
        code: "SQL_ERROR",
        message: "Unknown column revenue",
        detail: "Binder Error: revenue",
      },
    });
    peer.notify("run.finished", {
      rev: 1,
      runId: "run",
      status: "error",
      durationMs: 0,
      executed: [],
      cached: [],
    });
    return { runId: "run" };
  });
  const client = createEngineClient(clientEnd);
  const manifest = coreNodes.find((node) => node.id === "core.source.csv");
  if (!manifest) throw new Error("Missing manifest");

  try {
    await expect(
      runCase(client, manifest, {
        name: "error",
        params: { sourceId: "s" },
        inputs: {},
        expected: {},
      }),
    ).rejects.toThrow("subject: Unknown column revenue (Binder Error: revenue)");
  } finally {
    client.close();
    peer.close();
  }
});

it("reads chart specifications with data.view without waiting for a result reference", async () => {
  const [clientEnd, engineEnd] = createMemoryTransportPair();
  const peer = createPeer(engineEnd);
  const spec = { mark: "bar" };
  peer.handle("flow.set", () => ({ rev: 1, stale: [], errors: [] }));
  peer.handle("flow.run", () => {
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
  peer.handle("data.view", () => ({ spec, rowCount: 0, sampled: false }));
  const client = createEngineClient(clientEnd);
  const manifest = coreNodes.find((node) => node.id === "core.view.bar");
  if (!manifest) throw new Error("Missing manifest");

  try {
    expect(
      await runCase(client, manifest, {
        name: "chart",
        params: {},
        inputs: {},
        expected: { out: spec },
      }),
    ).toEqual({ out: spec });
  } finally {
    client.close();
    peer.close();
  }
});

it("uploads reference sources and reads the target result", async () => {
  const [clientEnd, engineEnd] = createMemoryTransportPair();
  const peer = createPeer(engineEnd);
  const reference = readReferenceFlows().find((flow) => flow.name === "reference:source-zscore");
  if (!reference) throw new Error("Missing reference flow");
  const expected = reference.expected["out"];
  if (!expected) throw new Error("Missing expected table");
  peer.handle("source.add", () => ({ sourceId: "uploaded", name: "zscore.csv" }));
  peer.handle("flow.set", (params) => {
    expect(params).toHaveProperty("flow.nodes.0.params.sourceId", "uploaded");
    return { rev: 1, stale: [], errors: [] };
  });
  peer.handle("flow.run", () => {
    peer.notify("node.result", {
      rev: 1,
      runId: "run",
      nodeId: "result",
      port: "out",
      ref: { id: "ref", rowCount: 8, schema: expected.columns },
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
  peer.handle("data.page", () => ({ ...expected, total: 8 }));
  const client = createEngineClient(clientEnd);

  try {
    expect(await runReferenceFlow(client, reference)).toEqual(reference.expected);
  } finally {
    client.close();
    peer.close();
  }
});
