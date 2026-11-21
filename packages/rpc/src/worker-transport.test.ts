import { describe, expect, it } from "vitest";
import { createPeer } from "./peer.ts";
import { createWorkerTransport } from "./worker-transport.ts";

describe("createWorkerTransport", () => {
  it("connects two peers through the ports of a MessageChannel", async () => {
    const channel = new MessageChannel();
    const client = createPeer(createWorkerTransport(channel.port1));
    const server = createPeer(createWorkerTransport(channel.port2));
    server.handle("ping", () => "pong");

    await expect(client.request("ping", null)).resolves.toBe("pong");

    client.close();
    server.close();
  });
});
