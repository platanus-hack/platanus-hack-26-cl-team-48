import { exportResult, importResult } from "./arrow-transfer.ts";
import type { DuckDbConnection, DuckDbFiles } from "./duckdb-port.ts";
import { NepErrorCode, type InProcessExecutor } from "@nodomics/protocol";
import { RpcError } from "@nodomics/rpc";
import { readPage } from "./result-pages.ts";
import { profileResult } from "./result-profiles.ts";
import { requireResult, type ResultTables } from "./result-tables.ts";
import { loadSource } from "./source-loading.ts";
import { runSqlTask } from "./sql-tasks.ts";

export type DuckDbExecutorOptions = {
  readonly files: DuckDbFiles;
  readonly connection: DuckDbConnection;
  /** Defaults to the platform `fetch`; injected so URL sources can be tested offline. */
  readonly fetch?: (url: string) => Promise<Response>;
};

const EXECUTOR_NAME = "duckdb-wasm";

/** Adapts DuckDB-WASM to the executor protocol. Results are tables named by their id. */
export function createDuckDbExecutor(options: DuckDbExecutorOptions): InProcessExecutor {
  const tables: ResultTables = { connection: options.connection, held: new Set() };
  const access = { files: options.files, fetch: options.fetch ?? ((url: string) => fetch(url)) };
  return {
    handlers: {
      "exec.hello": () => Promise.resolve({ executor: EXECUTOR_NAME, runtimes: ["sql"] }),
      "exec.run": async ({ task }) =>
        task.kind === "sql" ? runSqlTask(tables, task) : unsupportedRuntime(),
      "exec.page": (params) => readPage(tables, params),
      "exec.profile": ({ resultId }) => profileResult(tables, resultId),
      "exec.export": async ({ resultId }) => ({ arrow: await exportResult(tables, resultId) }),
      "exec.import": ({ arrow }) => importResult(tables, arrow),
      "exec.load": (params) => loadSource(tables, access, params),
      "exec.drop": async ({ resultIds }) => {
        await Promise.all(
          resultIds.filter((id) => tables.held.has(id)).map((id) => dropResult(tables, id)),
        );
        return {};
      },
      "exec.display": ({ displayId }) =>
        Promise.reject(
          new RpcError(NepErrorCode.RESULT_EXPIRED, `Figure ${displayId} is not held by DuckDB`),
        ),
      "exec.complete": () => Promise.resolve({ items: [] }),
    },
    onLog: () => () => undefined,
  };
}

async function dropResult(tables: ResultTables, id: string): Promise<void> {
  await tables.connection.query(`DROP TABLE IF EXISTS ${requireResult(tables, id)}`);
  tables.held.delete(id);
}

/** The coordinator only sends tasks for the runtimes announced in exec.hello. */
const unsupportedRuntime = (): never => {
  throw new Error("DuckDB executor received a task for a runtime it does not announce");
};
