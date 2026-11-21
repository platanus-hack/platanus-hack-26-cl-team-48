import { tableToIPC } from "apache-arrow";
import type { ResultRef } from "@nodomics/protocol";
import { createResultId, holdResult, requireResult, type ResultTables } from "./result-tables.ts";

/** Arrow IPC stream format, the one every executor (DuckDB, pyarrow) reads without copies. */
const IPC_FORMAT = "stream";

export async function exportResult(tables: ResultTables, resultId: string): Promise<Uint8Array> {
  return tableToIPC(
    await tables.connection.query(`SELECT * FROM ${requireResult(tables, resultId)}`),
    IPC_FORMAT,
  );
}

export async function importResult(tables: ResultTables, arrow: Uint8Array): Promise<ResultRef> {
  const id = createResultId();
  await tables.connection.insertArrowFromIPCStream(arrow, { name: id });
  return holdResult(tables, id);
}
