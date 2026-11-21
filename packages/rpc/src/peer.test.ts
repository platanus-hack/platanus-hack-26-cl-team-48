import { describe, expect, it } from "vitest";
import { JsonRpcErrorCode, RpcError } from "./errors.ts";
import { createMemoryTransportPair } from "./memory-transport.ts";
import { createPeer } from "./peer.ts";

const connectedPeers = () => {
  const [left, right] = createMemoryTransportPair();
  return { client: createPeer(left), server: createPeer(right) };
};

describe("createPeer", () => {
  it("resolves a request with the handler's result", async () => {
    const { client, server } = connectedPeers();
    server.handle("math.add", (params) => {
      const { a, b } = params as { a: number; b: number };
      return a + b;
    });

    await expect(client.request("math.add", { a: 2, b: 3 })).resolves.toBe(5);
  });

  it("awaits asynchronous handlers", async () => {
    const { client, server } = connectedPeers();
    server.handle("slow.echo", async (params) => Promise.resolve(params));

    await expect(client.request("slow.echo", "hola")).resolves.toBe("hola");
  });

  it("delivers notifications to subscribers without expecting a reply", async () => {
    const { client, server } = connectedPeers();
    const received = new Promise((resolve) => client.on("node.status", resolve));

    server.notify("node.status", { nodeId: "n1" });

    await expect(received).resolves.toEqual({ nodeId: "n1" });
  });

  it("stops delivering notifications after unsubscribing", async () => {
    const { client, server } = connectedPeers();
    const seen: unknown[] = [];
    const unsubscribe = client.on("tick", (params) => seen.push(params));

    unsubscribe();
    server.notify("tick", 1);
    await client.request("missing", null).catch(() => undefined);

    expect(seen).toEqual([]);
  });

  it("rejects requests to unknown methods with METHOD_NOT_FOUND", async () => {
    const { client } = connectedPeers();

    await expect(client.request("nope", null)).rejects.toMatchObject({
      code: JsonRpcErrorCode.METHOD_NOT_FOUND,
    });
  });

  it("forwards the code of an RpcError thrown by a handler", async () => {
    const { client, server } = connectedPeers();
    server.handle("data.page", () => {
      throw new RpcError(-32001, "Result expired");
    });

    await expect(client.request("data.page", {})).rejects.toMatchObject({
      code: -32001,
      message: "Result expired",
    });
  });

  it("reports unexpected handler failures as INTERNAL_ERROR", async () => {
    const { client, server } = connectedPeers();
    server.handle("boom", () => {
      throw new Error("kaput");
    });

    await expect(client.request("boom", null)).rejects.toMatchObject({
      code: JsonRpcErrorCode.INTERNAL_ERROR,
    });
  });

  it("rejects pending requests when the peer closes", async () => {
    const { client, server } = connectedPeers();
    server.handle("never", () => new Promise(() => undefined));
    const pending = client.request("never", null);

    client.close();

    await expect(pending).rejects.toMatchObject({ code: JsonRpcErrorCode.CONNECTION_CLOSED });
  });
});
