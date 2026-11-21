import { coreNodes, sampleDatasets } from "@nodomics/nodes-core";
import {
  FLOW_FORMAT,
  PROTOCOL_VERSION,
  NepErrorCode,
  toExecutorPort,
  type ExecutorCapabilities,
  type ExecutorHandlers,
  type ExecutorParams,
} from "@nodomics/protocol";
import { createMemoryTransportPair, createPeer, JsonRpcErrorCode } from "@nodomics/rpc";
import { afterEach, describe, expect, it } from "vitest";
import { createBrowserEngine } from "./browser-engine.ts";
import { serveHello } from "./engine-hello.ts";
import type { EngineConfig } from "./engine-config.ts";

const disposals: Array<() => void> = [];
afterEach(() => {
  disposals.splice(0).forEach((dispose) => {
    dispose();
  });
});

function fakeExecutor(capabilities: ExecutorCapabilities) {
  const loads: Array<ExecutorParams<"exec.load">> = [];
  const ref = { id: "fake-result", rowCount: 1, schema: [] };
  const handlers: ExecutorHandlers = {
    "exec.hello": () => Promise.resolve(capabilities),
    "exec.run": () => Promise.resolve({ ok: true, outputs: { out: ref } }),
    "exec.load": (params) => {
      loads.push(params);
      return Promise.resolve({ ok: true, ref });
    },
    "exec.page": () => Promise.resolve({ columns: [], rows: [[]], total: 1 }),
    "exec.profile": () => Promise.resolve({ columns: [] }),
    "exec.import": () => Promise.resolve(ref),
    "exec.export": () => Promise.resolve({ arrow: new Uint8Array() }),
    "exec.drop": () => Promise.resolve({}),
    "exec.display": () => Promise.resolve({ mime: "image/png", bytes: new Uint8Array() }),
    "exec.complete": () => Promise.resolve({ items: [] }),
  };
  return { loads, executor: toExecutorPort({ handlers, onLog: () => () => undefined }) };
}

function connect(config: EngineConfig = { mode: "browser" }) {
  const sql = fakeExecutor({ executor: "fake-sql", runtimes: ["sql"] });
  const python = fakeExecutor({
    executor: "fake-python",
    runtimes: ["python"],
    packages: ["pandas", "pyarrow"],
  });
  const [left, right] = createMemoryTransportPair();
  const client = createPeer(left);
  const server = createPeer(right);
  const engine = createBrowserEngine({ executors: [sql.executor, python.executor], config });
  disposals.push(
    engine.serve(server),
    () => {
      client.close();
    },
    () => {
      server.close();
    },
  );
  return { client, sql };
}

const hello = { protocol: PROTOCOL_VERSION, client: "tests" };
describe("createBrowserEngine", () => {
  it("announces the injected runtimes and Python packages in browser mode", async () => {
    const { client } = connect();

    await expect(client.request("engine.hello", hello)).resolves.toEqual({
      protocol: PROTOCOL_VERSION,
      engine: "browser",
      runtimes: ["sql", "python"],
      pythonPackages: ["pandas", "pyarrow"],
      sources: ["url", "upload"],
      codeCompletion: true,
    });
  });

  it("announces local paths in local mode", async () => {
    const { client } = connect({ mode: "local", url: "ws://127.0.0.1/?token=x" });

    await expect(client.request("engine.hello", hello)).resolves.toMatchObject({
      engine: "local",
      sources: ["url", "upload", "path"],
    });
  });

  it("serves the official node catalog through NEP", async () => {
    const { client } = connect();

    await expect(client.request("nodes.list", {})).resolves.toEqual({ nodes: coreNodes });
  });

  it("rejects incompatible protocols with the supported version as data", async () => {
    const { client } = connect();

    await expect(
      client.request("engine.hello", { ...hello, protocol: "0.2" }),
    ).rejects.toMatchObject({ code: NepErrorCode.PROTOCOL_MISMATCH, data: PROTOCOL_VERSION });
  });

  it("accepts patch versions of the supported pre-release protocol", async () => {
    const { client } = connect();

    await expect(
      client.request("engine.hello", { ...hello, protocol: `${PROTOCOL_VERSION}.7` }),
    ).resolves.toMatchObject({ protocol: PROTOCOL_VERSION });
  });

  it("parses hello parameters before handling the request", async () => {
    const { client } = connect();

    await expect(client.request("engine.hello", { protocol: 1 })).rejects.toMatchObject({
      code: JsonRpcErrorCode.INVALID_PARAMS,
    });
  });

  it("loads the official sample lazily by URL and emits run events", async () => {
    const { client, sql } = connect();
    const finished = new Promise((resolve) => {
      const stop = client.on("run.finished", (event) => {
        stop();
        resolve(event);
      });
    });
    await client.request("flow.set", {
      rev: 1,
      flow: {
        format: FLOW_FORMAT,
        nodes: [
          {
            id: "sample",
            type: "core.source.sample",
            version: "0.1.0",
            params: { dataset: "ventas" },
            position: { x: 0, y: 0 },
          },
        ],
        edges: [],
      },
    });
    expect(sql.loads).toEqual([]);

    await client.request("flow.run", { rev: 1 });
    await expect(finished).resolves.toMatchObject({ status: "done" });

    expect(sql.loads).toEqual([
      {
        sourceId: "sample.ventas",
        format: "csv",
        location: { kind: "url", url: sampleDatasets["sample.ventas"]?.url },
      },
    ]);
  });
});

it("reports invalid engine configuration through the hello response", async () => {
  const [left, right] = createMemoryTransportPair();
  const client = createPeer(left);
  const server = createPeer(right);
  disposals.push(
    () => {
      client.close();
    },
    () => {
      server.close();
    },
  );
  serveHello(server, { error: "Local executor host must be loopback" });

  await expect(client.request("engine.hello", hello)).rejects.toMatchObject({
    code: JsonRpcErrorCode.INVALID_PARAMS,
    message: "Local executor host must be loopback",
  });
});
