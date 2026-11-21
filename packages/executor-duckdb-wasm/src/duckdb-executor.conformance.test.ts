import { describeExecutorConformance } from "@nodomics/executor-conformance";
import { toExecutorPort } from "@nodomics/protocol";
import { createDuckDbExecutor } from "./duckdb-executor.ts";
import { openNodeDuckDb } from "./open-node-duckdb.ts";

describeExecutorConformance({
  name: "DuckDB-WASM",
  runtimes: ["sql"],
  create: async () => toExecutorPort(createDuckDbExecutor(await openNodeDuckDb())),
});
