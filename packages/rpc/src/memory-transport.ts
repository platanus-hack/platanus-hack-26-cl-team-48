import type { Transport } from "./transport.ts";

type Listeners = Set<(message: unknown) => void>;

/** Two connected in-process transports. Messages are cloned, as they would be across a worker. */
export function createMemoryTransportPair(): [Transport, Transport] {
  const channel = { isOpen: true };
  const leftListeners: Listeners = new Set();
  const rightListeners: Listeners = new Set();
  return [
    createEnd({ channel, own: leftListeners, other: rightListeners }),
    createEnd({ channel, own: rightListeners, other: leftListeners }),
  ];
}

function createEnd(end: {
  readonly channel: { isOpen: boolean };
  readonly own: Listeners;
  readonly other: Listeners;
}): Transport {
  return {
    send: (message) => {
      queueMicrotask(() => {
        if (end.channel.isOpen)
          end.other.forEach((listener) => {
            listener(structuredClone(message));
          });
      });
    },
    onMessage: (handler) => {
      end.own.add(handler);
      return () => end.own.delete(handler);
    },
    close: () => {
      end.channel.isOpen = false;
    },
  };
}
