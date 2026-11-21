import { NepRequests, PROTOCOL_VERSION } from "@nodomics/protocol";
import { createMemoryTransportPair, createPeer, JsonRpcErrorCode } from "@nodomics/rpc";
import { describe, expect, it } from "vitest";
import { serveMockEngine } from "./mock-engine.ts";
import { connectTestClient } from "./testing/connect-test-client.ts";

describe("startMockEngine", () => {
  it("answers engine.hello with the mock capabilities", async () => {
    const client = connectTestClient();

    const capabilities = await client.request("engine.hello", {
      protocol: PROTOCOL_VERSION,
      client: "web",
    });

    expect(capabilities).toEqual({
      protocol: PROTOCOL_VERSION,
      engine: "mock",
      runtimes: ["sql", "python"],
      sources: ["upload", "url"],
    });
  });

  it.each(Object.keys(NepRequests))(
    "rejects invalid %s params with INVALID_PARAMS",
    async (method) => {
      const client = connectTestClient();

      await expect(client.peer.request(method, null)).rejects.toMatchObject({
        code: JsonRpcErrorCode.INVALID_PARAMS,
      });
    },
  );
});

describe("serveMockEngine", () => {
  it("serves the engine on a peer the caller provides", async () => {
    const [engineEnd, clientEnd] = createMemoryTransportPair();
    serveMockEngine(createPeer(engineEnd));

    const answer = await createPeer(clientEnd).request("nodes.list", {});

    expect(answer).toHaveProperty("nodes");
  });
});
