import {
  COMPLETION_CASE,
  createResponseFetch,
  defineConformanceSuite,
} from "@nodomics/conformance";
import { createDuckDbExecutor } from "@nodomics/executor-duckdb-wasm";
import { createPyodideExecutor } from "@nodomics/executor-pyodide";
import { toExecutorPort, type ExecutorPort } from "@nodomics/protocol";
import { createMemoryTransportPair, createPeer } from "@nodomics/rpc";
import { loadPyodide } from "pyodide";
import { afterEach, beforeAll } from "vitest";
import { createBrowserEngine } from "./browser-engine.ts";
import { fetchWithFiles } from "./testing/fetch-with-files.ts";
import { openNodeDuckDb } from "./testing/node-duckdb.ts";

/** Measured: 5 to 60 s to load pandas and pyarrow in Node (cold disk cache), more when downloading. */
const PYODIDE_STARTUP_TIMEOUT_MS = 300_000;
const HAS_NETWORK = process.env["NODOMICS_PYODIDE_NETWORK"] === "1";
// Its case declares a synthetic sample the NEP cannot register; the real sample is covered by
// the reference cases (tests/conformance/README.md).
const SYNTHETIC_SAMPLE_CASES = ["core.source.sample"];

// Pyodide is loaded once for the whole suite: loading it per engine exceeds the run timeout.
const pythonExecutors: Promise<ExecutorPort[]> = HAS_NETWORK
  ? createPythonExecutor().then((executor) => [executor])
  : Promise.resolve([]);
beforeAll(() => pythonExecutors, PYODIDE_STARTUP_TIMEOUT_MS);

const disposals: Array<() => void> = [];
afterEach(() => {
  disposals
    .splice(0)
    .reverse()
    .forEach((dispose) => {
      dispose();
    });
});

defineConformanceSuite({
  name: "browser engine with real Node runtimes",
  skip: HAS_NETWORK
    ? SYNTHETIC_SAMPLE_CASES
    : [
        ...SYNTHETIC_SAMPLE_CASES,
        "core.python.custom",
        "core.python.zscore",
        "reference:source-zscore",
        "reference:ventas-filter-group",
        "reference:subflow-filter-group",
        COMPLETION_CASE,
      ],
  startEngine: async (responses) => {
    const database = await openNodeDuckDb();
    disposals.push(database.dispose);
    const executors = [
      toExecutorPort(createDuckDbExecutor({ ...database, fetch: fetchWithFiles })),
      ...(await pythonExecutors),
    ];
    const [client, transport] = createMemoryTransportPair();
    const peer = createPeer(transport);
    disposals.push(() => {
      peer.close();
    });
    disposals.push(
      createBrowserEngine({
        executors,
        fetch: createResponseFetch(responses),
        config: { mode: "browser" },
      }).serve(peer),
    );
    return client;
  },
});

async function createPythonExecutor(): Promise<ExecutorPort> {
  return toExecutorPort(
    await createPyodideExecutor({ pyodide: await loadPyodide(), fetch: fetchWithFiles }),
  );
}
