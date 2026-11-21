import type { Table } from "apache-arrow";

type MaybePromise<T> = T | Promise<T>;

/**
 * The part of DuckDB-WASM the executor uses. `AsyncDuckDB` (browser, behind its own worker) and
 * the blocking Node bindings both satisfy it, so results may come back sync or async.
 */
export interface DuckDbFiles {
  registerFileBuffer(name: string, bytes: Uint8Array): MaybePromise<unknown>;
  dropFile(name: string): MaybePromise<unknown>;
}

/** A DuckDB-WASM connection: `AsyncDuckDBConnection` or the blocking `DuckDBConnection`. */
export interface DuckDbConnection {
  query(sql: string): MaybePromise<Table>;
  insertArrowFromIPCStream(bytes: Uint8Array, options: { name: string }): MaybePromise<unknown>;
}
