import * as duckdb from "@duckdb/duckdb-wasm";
import mvpWasm from "@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url";
import ehWasm from "@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url";
import mvpWorker from "@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url";
import ehWorker from "@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url";
import { createDuckDbExecutor } from "@nodomics/executor-duckdb-wasm";
import { createPyodideExecutor } from "@nodomics/executor-pyodide";
import { toExecutorPort } from "@nodomics/protocol";
import { loadPyodide } from "pyodide";
import { lazyExecutorPort } from "./lazy-executor-port.ts";
import { PYODIDE_PACKAGES } from "./pyodide-packages.ts";

const PYODIDE_INDEX_URL = "https://cdn.jsdelivr.net/pyodide/v314.0.7/full/";

export async function createBrowserExecutors() {
  const bundle = await duckdb.selectBundle({
    mvp: { mainModule: mvpWasm, mainWorker: mvpWorker },
    eh: { mainModule: ehWasm, mainWorker: ehWorker },
  });
  if (!bundle.mainWorker) throw new Error("DuckDB bundle has no worker");
  const db = new duckdb.AsyncDuckDB(new duckdb.VoidLogger(), new Worker(bundle.mainWorker));
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
  return [
    toExecutorPort(createDuckDbExecutor({ files: db, connection: await db.connect() })),
    lazyExecutorPort(
      async () =>
        toExecutorPort(
          await createPyodideExecutor({
            pyodide: await loadPyodide({ indexURL: PYODIDE_INDEX_URL }),
          }),
        ),
      { executor: "pyodide", runtimes: ["python"], packages: [...PYODIDE_PACKAGES] },
    ),
  ];
}
