import { createDeferred } from "../testing/deferred.ts";
import { NepErrorCode } from "@nodomics/protocol";
import { describe, expect, it } from "vitest";
import { createAppStores } from "../app-stores.ts";
import { FakeRpcError, startFakeEngine, type FakeHandlers } from "../testing/fake-engine.ts";
import { openConnection } from "./open-connection.ts";
import type { Timers } from "./flow-sync.ts";

const node = (id: string) => ({
  id,
  type: "core.filter",
  version: "0.1.0",
  params: {},
  position: { x: 0, y: 0 },
});

function setup(handlers: FakeHandlers = {}) {
  const engine = startFakeEngine({
    "flow.set": ({ rev }) => ({ rev, stale: [], errors: [] }),
    ...handlers,
  });
  const stores = createAppStores();
  const pending: (() => void)[] = [];
  const timers: Timers = {
    set: (callback) => pending.push(callback),
    clear: () => undefined,
  };
  const errors: unknown[] = [];
  const opened = openConnection({
    entry: { id: "fake", label: "Fake", badge: "browser", connect: () => engine.transport },
    stores,
    timers,
    onError: (error) => errors.push(error),
  });
  const fireTimers = () => {
    pending.splice(0).forEach((callback) => {
      callback();
    });
  };
  const flowSets = () => engine.calls.filter((call) => call.method === "flow.set");
  return { engine, stores, opened, fireTimers, flowSets, errors };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("openConnection", () => {
  it("sends the current flow as soon as the engine is connected", async () => {
    const { opened, flowSets, stores } = setup();
    stores.flowStore.getState().dispatch({ type: "node.add", node: node("a") });

    expect(await opened.ready).toBeDefined();
    expect(flowSets()).toHaveLength(1);
    expect(flowSets()[0]?.params).toMatchObject({ rev: 1 });
  });

  it("sends every later change after the debounce delay", async () => {
    const { opened, flowSets, stores, fireTimers } = setup();
    await opened.ready;

    stores.flowStore.getState().dispatch({ type: "node.add", node: node("a") });
    stores.flowStore.getState().dispatch({ type: "node.add", node: node("b") });
    fireTimers();
    await settle();

    expect(flowSets().map((call) => call.params)).toMatchObject([{ rev: 0 }, { rev: 2 }]);
  });

  it("mirrors the engine's answers in the engine store", async () => {
    const { opened, stores } = setup({
      "flow.set": ({ rev }) => ({
        rev,
        stale: [],
        errors: [{ nodeId: "a", code: "PARAM_REQUIRED", message: "Falta" }],
      }),
    });

    await opened.ready;

    expect(stores.engineStore.getState().state.issues).toHaveLength(1);
  });

  it("does not send the flow when the engine refuses the connection", async () => {
    const { opened, flowSets } = setup({
      "engine.hello": () => {
        throw new FakeRpcError(NepErrorCode.UNAUTHORIZED, "no");
      },
    });

    expect(await opened.ready).toBeUndefined();
    expect(flowSets()).toEqual([]);
  });

  it("stops sending changes once closed", async () => {
    const { opened, flowSets, stores, fireTimers } = setup();
    await opened.ready;

    opened.close();
    stores.flowStore.getState().dispatch({ type: "node.add", node: node("a") });
    fireTimers();
    await settle();

    expect(flowSets()).toHaveLength(1);
  });

  it("flushes pending changes before a run so the engine runs the latest revision", async () => {
    const { opened, flowSets, stores } = setup();
    const connection = await opened.ready;
    stores.flowStore.getState().dispatch({ type: "node.add", node: node("a") });

    await connection?.flushFlow();

    expect(flowSets().at(-1)?.params).toMatchObject({ rev: 1 });
  });
});

it("keeps edits made while the first flow.set is awaiting acceptance", async () => {
  const accepted = createDeferred();
  const arrived = createDeferred();
  const { opened, stores, flowSets } = setup({
    "flow.set": async ({ rev }) => {
      if (rev === 0) {
        arrived.resolve();
        await accepted.promise;
      }
      return { rev, stale: [], errors: [] };
    },
  });
  await arrived.promise;
  stores.flowStore.getState().dispatch({ type: "node.add", node: node("a") });
  accepted.resolve();
  await opened.ready;
  expect(flowSets().map((call) => call.params)).toMatchObject([{ rev: 0 }, { rev: 1 }]);
  opened.close();
});

it("reads credentials on connection, substitutes before flow.set and resends replacements and deletions", async () => {
  const { SAMPLE } = await import("../canvas/canvas-fixtures.ts");
  const manifest = {
    ...SAMPLE,
    params: {
      type: "object" as const,
      properties: {
        headers: { type: "array", "x-nodomics": { widget: "key-values" } },
      },
    },
  };
  const { stores, opened, flowSets } = setup({ "nodes.list": () => ({ nodes: [manifest] }) });
  const library = stores.savedFlowStore.getState().library;
  await library.saveSecret({ name: "token", value: "first" });
  stores.flowStore.getState().dispatch({
    type: "node.add",
    node: {
      ...node("api"),
      type: manifest.id,
      params: { headers: [{ name: "Authorization", secret: "token" }] },
    },
  });
  const connection = await opened.ready;

  expect(flowSets().at(-1)?.params).toMatchObject({
    flow: { nodes: [{ params: { headers: [{ name: "Authorization", value: "first" }] } }] },
  });
  const edited = stores.flowStore.getState().state.flow;
  await stores.secretStore.getState().save({ name: "token", value: "second" });
  await connection?.flushFlow();
  expect(flowSets().at(-1)?.params).toMatchObject({
    flow: { nodes: [{ params: { headers: [{ name: "Authorization", value: "second" }] } }] },
  });
  await stores.secretStore.getState().remove("token");
  await connection?.flushFlow();
  expect(flowSets().at(-1)?.params).toMatchObject({
    flow: { nodes: [{ params: { headers: [{ name: "Authorization" }] } }] },
  });
  expect(stores.flowStore.getState().state.flow).toBe(edited);
  expect(JSON.stringify(edited)).not.toContain("first");
  expect(JSON.stringify(edited)).not.toContain("second");
  const count = flowSets().length;
  opened.close();
  await stores.secretStore.getState().save({ name: "token", value: "third" });
  await connection?.flushFlow();
  expect(flowSets()).toHaveLength(count);
});
