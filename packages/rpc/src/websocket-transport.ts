import { decodeJson, encodeJson } from "./json-codec.ts";
import type { Transport } from "./transport.ts";

export interface WebSocketLike {
  send(data: string): void;
  close(): void;
  addEventListener(type: "message", listener: (event: { data: unknown }) => void): void;
  removeEventListener(type: "message", listener: (event: { data: unknown }) => void): void;
}

export function createWebSocketTransport(socket: WebSocketLike): Transport {
  return {
    send: (message) => {
      socket.send(encodeJson(message));
    },
    onMessage: (handler) => {
      const listener = (event: { data: unknown }) => {
        if (typeof event.data === "string") handler(decodeJson(event.data));
      };
      socket.addEventListener("message", listener);
      return () => {
        socket.removeEventListener("message", listener);
      };
    },
    close: () => {
      socket.close();
    },
  };
}
