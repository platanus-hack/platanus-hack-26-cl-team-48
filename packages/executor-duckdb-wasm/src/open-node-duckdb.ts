import { createRequire } from "node:module";
import { createDuckDB, NODE_RUNTIME, VoidLogger } from "@duckdb/duckdb-wasm/blocking";
import { tableFromIPC, type Table } from "apache-arrow";
import type { DuckDbConnection, DuckDbFiles } from "./duckdb-port.ts";

const require = createRequire(import.meta.url);
const resolveDist = (file: string) => require.resolve(`@duckdb/duckdb-wasm/dist/${file}`);

/**
 * In Node, DuckDB-WASM builds its tables with the CommonJS copy of apache-arrow, whose classes
 * fail the `instanceof` checks of the ES module copy (tableToIPC silently writes 0 bytes).
 * Re-encoding with the CommonJS copy hands the executor tables of the ES module copy.
 */
const { tableToIPC: tableToIpcWithCommonJsArrow } = require("apache-arrow") as {
  tableToIPC: (table: Table, format: "stream") => Uint8Array;
};

export async function openNodeDuckDb(): Promise<{
  readonly files: DuckDbFiles;
  readonly connection: DuckDbConnection;
  readonly dispose: () => void;
}> {
  const db = await createDuckDB(
    {
      mvp: { mainModule: resolveDist("duckdb-mvp.wasm"), mainWorker: "" },
      eh: { mainModule: resolveDist("duckdb-eh.wasm"), mainWorker: "" },
    },
    new VoidLogger(),
    NODE_RUNTIME,
  );
  await db.instantiate();
  const connection = db.connect();
  return {
    files: db,
    connection: {
      query: (sql) => tableFromIPC(tableToIpcWithCommonJsArrow(connection.query(sql), "stream")),
      insertArrowFromIPCStream: (bytes, options) => {
        connection.insertArrowFromIPCStream(bytes, options);
      },
    },
    dispose: () => {
      connection.close();
      db.reset();
    },
  };
}
