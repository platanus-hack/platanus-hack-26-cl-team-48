import {
  createCoordinator,
  createNepEmitter,
  serveNep,
  type PresetSource,
} from "@nodomics/coordinator";
import { coreNodes, sampleDatasets } from "@nodomics/nodes-core";
import type { RpcPeer } from "@nodomics/rpc";
import type { BrowserEngineOptions } from "./browser-engine-options.ts";
import { serveHello } from "./engine-hello.ts";

export function createBrowserEngine(options: BrowserEngineOptions) {
  return {
    serve: (peer: RpcPeer): (() => void) => {
      const coordinator = createCoordinator({
        executors: options.executors,
        catalog: coreNodes,
        presetSources: createPresetSources(),
        emit: createNepEmitter(peer),
        ...(options.fetch === undefined ? {} : { fetch: options.fetch }),
      });
      serveNep(peer, coordinator);
      serveHello(peer, options);
      return coordinator.dispose;
    },
  };
}

function createPresetSources(): Readonly<Record<string, PresetSource>> {
  return Object.fromEntries(
    Object.entries(sampleDatasets).map(([id, source]) => [
      id,
      { format: source.format, location: { kind: "url", url: source.url } },
    ]),
  );
}
