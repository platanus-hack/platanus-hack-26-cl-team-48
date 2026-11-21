import { createMemoryTransportPair, createPeer, JsonRpcErrorCode } from "@nodomics/rpc";
import { describe, expect, it } from "vitest";
import { createCoordinator } from "./coordinator.ts";
import { createNepEmitter, serveNep } from "./serve-nep.ts";
import { coreCatalog, flowNode, flowOf } from "./testing/catalog-fixtures.ts";
import { createFakeExecutor } from "./testing/fake-executor.ts";

const connect = () => {
  const [clientSide, engineSide] = createMemoryTransportPair();
  const engine = createPeer(engineSide);
  const executor = createFakeExecutor({
    capabilities: { executor: "fake-sql", runtimes: ["sql"] },
    logWhileRunning: "leyendo",
  });
  serveNep(
    engine,
    createCoordinator({
      executors: [executor],
      catalog: coreCatalog,
      emit: createNepEmitter(engine),
      presetSources: {
        src_1: { format: "csv", location: { kind: "url", url: "https://x/v.csv" } },
      },
    }),
  );
  return createPeer(clientSide);
};

describe("serveNep", () => {
  it("answers NEP requests through the peer", async () => {
    const client = connect();

    await expect(client.request("nodes.list", {})).resolves.toMatchObject({
      nodes: expect.arrayContaining([expect.objectContaining({ id: "core.filter" })]) as unknown,
    });
  });

  it("rejects params that do not match the protocol with INVALID_PARAMS", async () => {
    const client = connect();

    await expect(client.request("flow.set", { rev: -1, flow: "nope" })).rejects.toMatchObject({
      code: JsonRpcErrorCode.INVALID_PARAMS,
    });
  });

  it("sends node events and executor logs to the client as notifications", async () => {
    const client = connect();
    const finished = new Promise((resolve) => client.on("run.finished", resolve));
    const logs: unknown[] = [];
    client.on("run.log", (log) => logs.push(log));
    await client.request("flow.set", {
      rev: 1,
      flow: flowOf([flowNode("s", "core.source", { sourceId: "src_1" })], []),
    });

    await client.request("flow.run", { rev: 1 });
    await finished;

    expect(logs).toEqual([
      expect.objectContaining({ nodeId: "s", level: "info", message: "leyendo" }),
    ]);
  });
});
