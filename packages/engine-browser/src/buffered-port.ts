import type { MessagePortLike } from "@nodomics/rpc";

type Listener = (event: MessageEvent) => void;

// A worker drops messages that arrive while no listener exists, such as the interface's
// engine.hello while the executors are still initializing. They are replayed in a microtask
// because the peer listens before the engine registers its handlers.
export function bufferMessages(port: MessagePortLike): MessagePortLike {
  const early: MessageEvent[] = [];
  const hold: Listener = (event) => early.push(event);
  port.addEventListener("message", hold);
  return {
    postMessage: (message) => {
      port.postMessage(message);
    },
    addEventListener: (type, listener) => {
      port.addEventListener(type, listener);
      port.removeEventListener("message", hold);
      queueMicrotask(() => {
        early.splice(0).forEach(listener);
      });
    },
    removeEventListener: (type, listener) => {
      port.removeEventListener(type, listener);
    },
  };
}
