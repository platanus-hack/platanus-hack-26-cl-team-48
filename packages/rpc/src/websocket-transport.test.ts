import { describe, expect, it } from "vitest";
import { createWebSocketTransport, type WebSocketLike } from "./websocket-transport.ts";

const fakeSocket = () => {
  const sent: string[] = [];
  const listeners: ((event: { data: unknown }) => void)[] = [];
  const socket: WebSocketLike = {
    send: (data) => sent.push(data),
    close: () => undefined,
    addEventListener: (_type, listener) => listeners.push(listener),
    removeEventListener: () => undefined,
  };
  return {
    socket,
    sent,
    receive: (data: string) => {
      listeners.forEach((l) => {
        l({ data });
      });
    },
  };
};

describe("createWebSocketTransport", () => {
  it("sends messages as JSON text", () => {
    const { socket, sent } = fakeSocket();

    createWebSocketTransport(socket).send({ jsonrpc: "2.0", method: "exec.hello", params: {} });

    expect(JSON.parse(sent[0] ?? "")).toEqual({ jsonrpc: "2.0", method: "exec.hello", params: {} });
  });

  it("decodes incoming text frames, including binary fields", () => {
    const { socket, receive } = fakeSocket();
    const received: unknown[] = [];
    createWebSocketTransport(socket).onMessage((message) => received.push(message));

    receive('{"jsonrpc":"2.0","id":1,"result":{"arrow":{"$bytes":"aGk="}}}');

    expect(received).toEqual([
      { jsonrpc: "2.0", id: 1, result: { arrow: new Uint8Array([104, 105]) } },
    ]);
  });
});
