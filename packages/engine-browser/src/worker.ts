import { createBrowserExecutors } from "./browser-executors.ts";
import { composeExecutors } from "./compose-executors.ts";
import type { ExecutorPort } from "@nodomics/protocol";
import { createPeer, createWebSocketTransport, createWorkerTransport } from "@nodomics/rpc";
import { createBrowserEngine } from "./browser-engine.ts";
import { createRemoteExecutor } from "./remote-executor.ts";
import { readEngineConfig } from "./engine-config.ts";
import { serveHello } from "./engine-hello.ts";
import { bufferMessages } from "./buffered-port.ts";

async function startWorker(): Promise<void> {
  const config = readEngineConfig(self.location.search);
  const port = bufferMessages(self);
  if (!config.ok) {
    serveHello(createPeer(createWorkerTransport(port)), config);
    return;
  }
  const executors = await composeExecutors(config.value, {
    browser: createBrowserExecutors,
    local: connectLocalExecutor,
  });
  // The peer is created only now, so requests buffered meanwhile meet registered handlers.
  createBrowserEngine({
    config: config.value,
    executors,
    fetch: (url, init) => fetch(url, init),
  }).serve(createPeer(createWorkerTransport(port)));
}

function connectLocalExecutor(url: string): ExecutorPort {
  const socket = new WebSocket(url);
  const opened = waitForOpen(socket);
  // Keep connection failures handled even before the first NEP request arrives.
  void opened.catch(() => undefined);
  const remote = createRemoteExecutor(createPeer(createWebSocketTransport(socket)));
  return {
    request: async (method, params) => {
      await opened;
      return remote.request(method, params);
    },
    onLog: (handler) => remote.onLog(handler),
  };
}

function waitForOpen(socket: WebSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    socket.addEventListener(
      "open",
      () => {
        resolve();
      },
      { once: true },
    );
    socket.addEventListener(
      "error",
      () => {
        reject(new Error("Cannot connect to the local executor"));
      },
      { once: true },
    );
  });
}

await startWorker();
