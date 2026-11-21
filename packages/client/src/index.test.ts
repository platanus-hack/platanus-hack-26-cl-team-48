import { describe, expect, it } from "vitest";
import * as client from "./index.ts";

describe("public api", () => {
  it("offers the transports so the interface never imports rpc directly", () => {
    expect(client.createWorkerTransport).toBeTypeOf("function");
    expect(client.createWebSocketTransport).toBeTypeOf("function");
    expect(client.createMemoryTransportPair).toBeTypeOf("function");
  });
});
