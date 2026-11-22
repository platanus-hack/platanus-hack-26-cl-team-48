import { describe, expect, it } from "vitest";
import type { DeploymentRecord } from "./deployment-store.ts";
import { createMemoryDeploymentStore } from "./memory-deployment-store.ts";

const recordOf = (overrides: Partial<DeploymentRecord> = {}): DeploymentRecord => ({
  id: "dep-1",
  ownerId: "alice",
  flowId: "flow-1",
  nodeId: "web",
  providerServiceId: "srv-1",
  url: "https://nd-alice-web.onrender.com",
  spec: {
    repo: { url: "https://github.com/nodomics/demo-app", branch: "main" },
    build: { kind: "native", runtime: "node", buildCommand: "npm ci", startCommand: "npm start" },
    env: [],
  },
  specHash: "hash-1",
  status: "deploying",
  updatedAt: "2026-11-22T10:00:00.000Z",
  ...overrides,
});

async function storeWith(records: DeploymentRecord[]) {
  const store = createMemoryDeploymentStore();
  for (const record of records) await store.save(record);
  return store;
}

describe("createMemoryDeploymentStore", () => {
  it("gets a saved record by its owner and id", async () => {
    const store = await storeWith([recordOf()]);

    const result = await store.get("alice", "dep-1");

    expect(result).toEqual({ ok: true, value: recordOf() });
  });

  it("never gets a record of another owner", async () => {
    const store = await storeWith([recordOf()]);

    const result = await store.get("mallory", "dep-1");

    expect(result).toEqual({ ok: true, value: undefined });
  });

  it("returns undefined for an unknown id", async () => {
    const store = await storeWith([recordOf()]);

    const result = await store.get("alice", "dep-404");

    expect(result).toEqual({ ok: true, value: undefined });
  });

  it("finds the record of a node in a flow", async () => {
    const store = await storeWith([
      recordOf(),
      recordOf({ id: "dep-2", nodeId: "api", providerServiceId: "srv-2" }),
    ]);

    const result = await store.findByNode("alice", "flow-1", "api");

    expect(result).toEqual({
      ok: true,
      value: recordOf({ id: "dep-2", nodeId: "api", providerServiceId: "srv-2" }),
    });
  });

  it("never finds the record of the same flow and node id owned by another user", async () => {
    const store = await storeWith([recordOf({ ownerId: "mallory" })]);

    const result = await store.findByNode("alice", "flow-1", "web");

    expect(result).toEqual({ ok: true, value: undefined });
  });

  it("lists only the owner's records of the given flow", async () => {
    const store = await storeWith([
      recordOf(),
      recordOf({ id: "dep-2", nodeId: "api" }),
      recordOf({ id: "dep-3", flowId: "flow-2" }),
      recordOf({ id: "dep-4", ownerId: "mallory" }),
    ]);

    const result = await store.listByFlow("alice", "flow-1");

    expect(result.ok ? result.value.map((record) => record.id).sort() : []).toEqual([
      "dep-1",
      "dep-2",
    ]);
  });

  it("lists nothing for a flow without records", async () => {
    const store = await storeWith([recordOf()]);

    const result = await store.listByFlow("alice", "flow-2");

    expect(result).toEqual({ ok: true, value: [] });
  });

  it("counts the records of one owner", async () => {
    const store = await storeWith([
      recordOf(),
      recordOf({ id: "dep-2", flowId: "flow-2" }),
      recordOf({ id: "dep-3", ownerId: "bob" }),
    ]);

    const result = await store.countByOwner("alice");

    expect(result).toEqual({ ok: true, value: 2 });
  });

  it("counts the records of every owner", async () => {
    const store = await storeWith([
      recordOf(),
      recordOf({ id: "dep-2", flowId: "flow-2" }),
      recordOf({ id: "dep-3", ownerId: "bob" }),
    ]);

    const result = await store.countAll();

    expect(result).toEqual({ ok: true, value: 3 });
  });

  it("starts empty", async () => {
    const store = createMemoryDeploymentStore();

    const counts = [await store.countAll(), await store.countByOwner("alice")];

    expect(counts).toEqual([
      { ok: true, value: 0 },
      { ok: true, value: 0 },
    ]);
  });

  it("replaces a record saved again with the same id", async () => {
    const store = await storeWith([recordOf()]);

    await store.save(recordOf({ status: "live", specHash: "hash-2" }));

    expect(await store.get("alice", "dep-1")).toEqual({
      ok: true,
      value: recordOf({ status: "live", specHash: "hash-2" }),
    });
    expect(await store.countAll()).toEqual({ ok: true, value: 1 });
  });

  it("removes a record", async () => {
    const store = await storeWith([recordOf(), recordOf({ id: "dep-2", nodeId: "api" })]);

    const result = await store.remove("dep-1");

    expect(result.ok).toBe(true);
    expect(await store.get("alice", "dep-1")).toEqual({ ok: true, value: undefined });
    expect(await store.countAll()).toEqual({ ok: true, value: 1 });
  });
});
