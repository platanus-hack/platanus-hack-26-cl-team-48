import { expect, it } from "vitest";
import { createMemoryTransportPair, createPeer } from "@nodomics/rpc";
import { createExecutorPeer } from "./python-local-peer.ts";

it("parses executor replies and forwards logs through the public port", async () => {
  const [client, server] = createMemoryTransportPair();
  const remote = createPeer(server);
  const peer = createPeer(client);
  const executor = createExecutorPeer(peer);
  const logs: unknown[] = [];
  const unsubscribe = executor.onLog((log) => logs.push(log));
  remote.handle("exec.hello", () => ({ executor: "fake", runtimes: ["sql", "python"] }));

  await expect(executor.request("exec.hello", {})).resolves.toEqual({
    executor: "fake",
    runtimes: ["sql", "python"],
  });
  remote.notify("exec.log", { taskId: "task", level: "info", message: "hello" });
  await Promise.resolve();
  expect(logs).toEqual([{ taskId: "task", level: "info", message: "hello" }]);
  unsubscribe();
  peer.close();
  remote.close();
});

it("rejects malformed executor replies", async () => {
  const [client, server] = createMemoryTransportPair();
  const remote = createPeer(server);
  const peer = createPeer(client);
  remote.handle("exec.hello", () => ({ runtimes: "sql" }));

  await expect(createExecutorPeer(peer).request("exec.hello", {})).rejects.toThrow(
    /exec.hello.*executor/su,
  );
  peer.close();
  remote.close();
});
