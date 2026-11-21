import { expect, it } from "vitest";
import { bufferMessages } from "./buffered-port.ts";

function createPort() {
  const target = new EventTarget();
  return {
    port: {
      postMessage: () => undefined,
      addEventListener: (type: "message", listener: (event: MessageEvent) => void) => {
        target.addEventListener(type, listener as EventListener);
      },
      removeEventListener: (type: "message", listener: (event: MessageEvent) => void) => {
        target.removeEventListener(type, listener as EventListener);
      },
    },
    receive: (data: unknown) => target.dispatchEvent(new MessageEvent("message", { data })),
  };
}

it("delivers early messages after the listener's owner finishes registering handlers", async () => {
  const { port, receive } = createPort();
  const buffered = bufferMessages(port);
  receive("hello");
  const received: unknown[] = [];
  buffered.addEventListener("message", (event) => received.push(event.data));
  expect(received).toEqual([]);
  await Promise.resolve();
  receive("run");
  expect(received).toEqual(["hello", "run"]);
});
