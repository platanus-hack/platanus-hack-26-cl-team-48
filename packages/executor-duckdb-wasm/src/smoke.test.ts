import { expect, it } from "vitest";
import { openNodeDuckDb } from "./open-node-duckdb.ts";

it("runs SELECT 42 in DuckDB-WASM under Node", async () => {
  const { connection } = await openNodeDuckDb();

  const table = await connection.query("SELECT 42 AS answer");

  expect(table.getChild("answer")?.get(0)).toBe(42);
});
