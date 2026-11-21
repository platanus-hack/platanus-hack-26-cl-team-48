import { NepErrorCode, type Column, type ResultRef } from "@nodomics/protocol";
import { RpcError } from "@nodomics/rpc";
import { toColumns } from "./column-types.ts";
import type { DuckDbConnection } from "./duckdb-port.ts";
import { quoteIdentifier } from "./sql-identifiers.ts";

/** Each result is a DuckDB table named by its id; `held` lists the ones this executor owns. */
export type ResultTables = {
  readonly connection: DuckDbConnection;
  readonly held: Set<string>;
};

export const createResultId = (): string => `r_${crypto.randomUUID().replaceAll("-", "")}`;

/** Registers a table the executor just created and describes it as a result reference. */
export async function holdResult(tables: ResultTables, id: string): Promise<ResultRef> {
  tables.held.add(id);
  return {
    id,
    rowCount: await countRows(tables.connection, id),
    schema: await readColumns(tables, id),
  };
}

/** Fails the request when the result was dropped or never existed, so the caller recomputes it. */
export function requireResult(tables: ResultTables, id: string): string {
  if (!tables.held.has(id))
    throw new RpcError(NepErrorCode.RESULT_EXPIRED, `Result ${id} is not held by this executor`);
  return quoteIdentifier(id);
}

export async function readColumns(tables: ResultTables, id: string): Promise<Column[]> {
  return toColumns(
    (await tables.connection.query(`SELECT * FROM ${requireResult(tables, id)} LIMIT 0`)).schema,
  );
}

export async function countRows(connection: DuckDbConnection, id: string): Promise<number> {
  const table = await connection.query(`SELECT count(*)::DOUBLE AS n FROM ${quoteIdentifier(id)}`);
  return Number(table.getChild("n")?.get(0));
}
