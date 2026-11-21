import type { Transport } from "./transport.ts";

/** Anything that speaks postMessage: a Worker, a MessagePort, or a worker's global scope. */
export interface MessagePortLike {
  postMessage(message: unknown): void;
  addEventListener(type: "message", listener: (event: MessageEvent) => void): void;
  removeEventListener(type: "message", listener: (event: MessageEvent) => void): void;
  start?(): void;
  close?(): void;
}

export function createWorkerTransport(port: MessagePortLike): Transport {
  return {
    send: (message) => {
      port.postMessage(message);
    },
    onMessage: (handler) => {
      const listener = (event: MessageEvent) => {
        handler(event.data);
      };
      port.addEventListener("message", listener);
      // MessagePort only dispatches to addEventListener listeners after start().
      port.start?.();
      return () => {
        port.removeEventListener("message", listener);
      };
    },
    close: () => port.close?.(),
  };
}
