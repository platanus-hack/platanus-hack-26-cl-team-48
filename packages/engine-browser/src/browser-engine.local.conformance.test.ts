import { createResponseFetch, defineConformanceSuite } from "@nodomics/conformance";
import { createMemoryTransportPair, createPeer } from "@nodomics/rpc";
import { afterEach, describe } from "vitest";
import { createBrowserEngine } from "./browser-engine.ts";
import { createRemoteExecutor } from "./remote-executor.ts";
import { isPythonLocalInstalled, startPythonLocal } from "./testing/python-local-process.ts";

// Its case declares a synthetic sample the NEP cannot register; the real sample is covered by
// the reference cases (tests/conformance/README.md).
const SYNTHETIC_SAMPLE_CASES = ["core.source.sample"];

// The Python executor only downloads http(s) URLs; in Node the sample ventas is a file:// URL.
const FILE_URL_SAMPLE_CASES = ["reference:ventas-filter-group", "reference:subflow-filter-group"];

const disposals: Array<() => void | Promise<void>> = [];
afterEach(async () => {
  for (const dispose of disposals.splice(0).reverse()) await dispose();
});

describe.skipIf(!isPythonLocalInstalled)(
  "Python local binary unavailable; run `uv sync` in engines/python-local",
  () => {
    defineConformanceSuite({
      name: "local engine with the Python executor",
      skip: [...SYNTHETIC_SAMPLE_CASES, ...FILE_URL_SAMPLE_CASES],
      startEngine: async (responses) => {
        const python = await startPythonLocal();
        disposals.push(python.stop, () => {
          python.peer.close();
        });
        const [client, transport] = createMemoryTransportPair();
        const peer = createPeer(transport);
        disposals.push(() => {
          peer.close();
        });
        disposals.push(
          createBrowserEngine({
            executors: [createRemoteExecutor(python.peer)],
            fetch: createResponseFetch(responses),
            config: { mode: "local", url: python.url },
          }).serve(peer),
        );
        return client;
      },
    });
  },
);
