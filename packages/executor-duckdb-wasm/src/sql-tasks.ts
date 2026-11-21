import type { ExecutorResult } from "@nodomics/protocol";
import { createResultId, holdResult, requireResult, type ResultTables } from "./result-tables.ts";
import { toSqlNodeError } from "./sql-errors.ts";
import { quoteIdentifier } from "./sql-identifiers.ts";

/** SQL nodes have a single output port; the coordinator names it `out` in every manifest. */
const SQL_OUTPUT_PORT = "out";
const TRAILING_SEMICOLONS = /[\s;]+$/;

export type SqlTask = {
  readonly query: string;
  readonly inputs: Readonly<Record<string, string>>;
};

/** Runs the final SQL with each input alias bound to its result and stores the output as a new result. */
export async function runSqlTask(
  tables: ResultTables,
  task: SqlTask,
): Promise<ExecutorResult<"exec.run">> {
  const id = createResultId();
  // Built outside the try: an expired input must reject the request, not become a SQL error.
  const materialization = buildMaterialization(tables, task, id);
  try {
    await tables.connection.query(materialization);
  } catch (error) {
    return { ok: false, error: toSqlNodeError(error) };
  }
  return { ok: true, outputs: { [SQL_OUTPUT_PORT]: await holdResult(tables, id) } };
}

/** Input aliases become CTEs, so concurrent tasks never share views. */
function buildMaterialization(tables: ResultTables, task: SqlTask, id: string): string {
  const aliases = Object.entries(task.inputs).map(
    ([alias, resultId]) =>
      `${quoteIdentifier(alias)} AS (SELECT * FROM ${requireResult(tables, resultId)})`,
  );
  const withClause = aliases.length === 0 ? "" : `WITH ${aliases.join(", ")} `;
  return `CREATE TABLE ${quoteIdentifier(id)} AS ${withClause}SELECT * FROM (${task.query.replace(TRAILING_SEMICOLONS, "")})`;
}
