import { describe, expect, it } from "vitest";
import { createMemoryTransportPair } from "./memory-transport.ts";

describe("createMemoryTransportPair", () => {
  it("delivers a copy so peers never share mutable objects", async () => {
    const [left, right] = createMemoryTransportPair();
    const message = { jsonrpc: "2.0", method: "x", params: { list: [1] } } as const;
    const received = new Promise((resolve) => right.onMessage(resolve));

    left.send(message);

    const copy = await received;
    expect(copy).toEqual(message);
    expect(copy).not.toBe(message);
  });
});
