import { NepErrorCode, type ExecutorLog, type ExecutorMethod } from "@nodomics/protocol";
import { createMemoryTransportPair, createPeer, RpcError } from "@nodomics/rpc";
import { afterEach, describe, expect, it } from "vitest";
import { createRemoteExecutor } from "./remote-executor.ts";

const disposals: Array<() => void> = [];
afterEach(() => {
  disposals.splice(0).forEach((dispose) => {
    dispose();
  });
});
const connect = () => {
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
  return { executor: createRemoteExecutor(client), server };
};

describe("createRemoteExecutor", () => {
  const ref = { id: "r", rowCount: 1, schema: [{ name: "x", type: "number" as const }] };
  const cases: Array<{
    method: ExecutorMethod;
    params: object;
    result: unknown;
  }> = [
    { method: "exec.hello", params: {}, result: { executor: "local", runtimes: ["sql"] } },
    {
      method: "exec.run",
      params: { taskId: "t", task: { kind: "sql", query: "SELECT 1", inputs: {} } },
      result: { ok: true, outputs: { out: ref } },
    },
    {
      method: "exec.page",
      params: { resultId: "r", offset: 0, limit: 1 },
      result: { columns: ref.schema, rows: [[1]], total: 1 },
    },
    { method: "exec.profile", params: { resultId: "r" }, result: { columns: [] } },
    { method: "exec.export", params: { resultId: "r" }, result: { arrow: new Uint8Array([1]) } },
    { method: "exec.import", params: { arrow: new Uint8Array([1]) }, result: ref },
    {
      method: "exec.load",
      params: {
        sourceId: "s",
        format: "csv",
        location: { kind: "bytes", bytes: new Uint8Array([1]) },
      },
      result: { ok: true, ref },
    },
    { method: "exec.drop", params: { resultIds: ["r"] }, result: {} },
  ];
  it.each(cases)(
    "forwards $method requests and parses their results",
    async ({ method, params, result }) => {
      const { executor, server } = connect();
      const received: unknown[] = [];
      server.handle(method, (value) => {
        received.push(value);
        return result;
      });

      await expect(executor.request(method, params)).resolves.toEqual(result);
      expect(received).toEqual([params]);
    },
  );

  it("parses capabilities returned by a remote executor", async () => {
    const { executor, server } = connect();
    const hello = { executor: "python-local", runtimes: ["sql", "python"], packages: ["pandas"] };
    server.handle("exec.hello", () => hello);

    await expect(executor.request("exec.hello", {})).resolves.toEqual(hello);
  });

  it("rejects malformed results at the remote boundary", async () => {
    const { executor, server } = connect();
    server.handle("exec.hello", () => ({ runtimes: ["invalid"] }));

    await expect(executor.request("exec.hello", {})).rejects.toBeInstanceOf(RpcError);
  });

  it("preserves remote RPC errors", async () => {
    const { executor, server } = connect();
    server.handle("exec.page", () => {
      throw new RpcError(NepErrorCode.RESULT_EXPIRED, "expired");
    });

    await expect(
      executor.request("exec.page", { resultId: "r", offset: 0, limit: 1 }),
    ).rejects.toMatchObject({ code: NepErrorCode.RESULT_EXPIRED });
  });

  it("forwards valid logs and unsubscribes", async () => {
    const { executor, server } = connect();
    const logs: ExecutorLog[] = [];
    const stop = executor.onLog((log) => logs.push(log));
    const log = { taskId: "t", level: "info", message: "hello" };
    server.handle("exec.hello", () => ({ executor: "local", runtimes: [] }));
    server.notify("exec.log", log);
    await executor.request("exec.hello", {});
    stop();
    server.notify("exec.log", { ...log, message: "after" });
    server.notify("exec.log", { invalid: true });
    await executor.request("exec.hello", {});

    expect(logs).toEqual([log]);
  });
});
