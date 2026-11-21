import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import type { DuckDbConnection, DuckDbFiles } from "@nodomics/executor-duckdb-wasm";

type Table = Awaited<ReturnType<DuckDbConnection["query"]>>;
type NodeConnection = { query(sql: string): unknown; close(): void } & Pick<
  DuckDbConnection,
  "insertArrowFromIPCStream"
>;
type NodeDatabase = DuckDbFiles & {
  instantiate(): Promise<void>;
  connect(): NodeConnection;
  reset(): void;
};
type BlockingBindings = {
  readonly createDuckDB: (
    bundles: unknown,
    logger: unknown,
    runtime: unknown,
  ) => Promise<NodeDatabase>;
  VoidLogger: new () => unknown;
  NODE_RUNTIME: unknown;
};
type ArrowIpc = {
  readonly tableToIPC: (table: unknown, format: "stream") => Uint8Array;
  readonly tableFromIPC: (bytes: Uint8Array) => Table;
};

const IPC_FORMAT = "stream";

export async function openNodeDuckDb() {
  // Resolve the installed runtime through its owning package's public entry, without adding dependencies.
  const require = createRequire(import.meta.resolve("@nodomics/executor-duckdb-wasm"));
  // The external CommonJS module has no runtime parser; this is its published blocking API.
  const { createDuckDB, VoidLogger, NODE_RUNTIME } =
    require("@duckdb/duckdb-wasm/blocking") as BlockingBindings;
  const db = await createDuckDB(
    {
      mvp: {
        mainModule: require.resolve("@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm"),
        mainWorker: "",
      },
      eh: {
        mainModule: require.resolve("@duckdb/duckdb-wasm/dist/duckdb-eh.wasm"),
        mainWorker: "",
      },
    },
    new VoidLogger(),
    NODE_RUNTIME,
  );
  await db.instantiate();
  const connection = db.connect();
  const toExecutorTable = await createArrowBridge(require);
  return {
    files: db,
    connection: {
      query: (sql: string) => toExecutorTable(connection.query(sql)),
      insertArrowFromIPCStream: (bytes: Uint8Array, options: { name: string }) =>
        connection.insertArrowFromIPCStream(bytes, options),
    } satisfies DuckDbConnection,
    dispose: () => {
      connection.close();
      db.reset();
    },
  };
}

/**
 * The blocking bindings build tables with the CommonJS copy of apache-arrow, whose classes fail
 * the `instanceof` checks of the ES module copy the executor uses (tableToIPC writes 0 bytes).
 * Re-encoding with the CommonJS copy and decoding with the ES module copy bridges the two.
 */
async function createArrowBridge(require: NodeJS.Require): Promise<(table: unknown) => Table> {
  const commonJs = require("apache-arrow") as ArrowIpc;
  // Same file the executor's `import "apache-arrow"` loads under the Node `import` condition.
  const esModule = (await import(
    pathToFileURL(require.resolve("apache-arrow").replace(/\.js$/, ".mjs")).href
  )) as ArrowIpc;
  return (table) => esModule.tableFromIPC(commonJs.tableToIPC(table, IPC_FORMAT));
}
