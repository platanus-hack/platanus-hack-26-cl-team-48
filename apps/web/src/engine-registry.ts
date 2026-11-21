import { createWorkerTransport, type Transport } from "@nodomics/client";
import browserWorkerUrl from "@nodomics/engine-browser/worker?worker&url";
import mockWorkerUrl from "@nodomics/engine-mock/worker?worker&url";
import type { EngineEntry } from "./engine/engine-entry.ts";
import type { LocalAddress } from "./engine/local-address.ts";
import { MESSAGES } from "./messages.ts";

// ADR 0008: only this composition root imports engine worker URLs.
export const ENGINES = createEngineRegistry(connectWorker);

export function createEngineRegistry(
  connect: (url: string) => Transport,
): ReadonlyArray<EngineEntry> {
  return [
    {
      id: "browser",
      label: MESSAGES.engines.browser,
      badge: "browser",
      connect: () => connect(browserWorkerUrl),
    },
    {
      id: "python-local",
      label: MESSAGES.engines.pythonLocal,
      badge: "local",
      address: "local",
      connect: (address) => connect(localWorkerUrl(address)),
    },
    {
      id: "mock",
      label: MESSAGES.engines.mock,
      badge: "browser",
      connect: () => connect(mockWorkerUrl),
    },
  ];
}

function localWorkerUrl(address: LocalAddress | undefined): string {
  if (address === undefined) throw new Error("A local engine needs a parsed address");
  const url = new URL(browserWorkerUrl, window.location.href);
  url.searchParams.set("local", address.url);
  url.searchParams.set("token", address.token);
  return url.href;
}

function connectWorker(url: string): Transport {
  const worker = new Worker(url, { type: "module" });
  const transport = createWorkerTransport(worker);
  return {
    ...transport,
    close: () => {
      transport.close();
      // A Worker has no close(); only terminate() frees it.
      worker.terminate();
    },
  };
}
