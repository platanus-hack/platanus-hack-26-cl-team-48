import type { EngineClient } from "@nodomics/client";
import type { ResultRef } from "@nodomics/protocol";
import type { Table } from "./test-case.ts";

const PAGE_SIZE = 1000;

export async function readTable(client: EngineClient, ref: ResultRef): Promise<Table> {
  const rows: unknown[][] = [];
  do {
    const page = await client.request("data.page", {
      ref: ref.id,
      offset: rows.length,
      limit: PAGE_SIZE,
    });
    if (page.total !== ref.rowCount)
      throw new Error(
        `Page total for ${ref.id}: expected ${String(ref.rowCount)}, got ${String(page.total)}`,
      );
    if (page.rows.length === 0 && rows.length < page.total)
      throw new Error(`Empty page before end of ${ref.id}`);
    rows.push(...page.rows);
    if (rows.length >= page.total) return { columns: page.columns, rows };
  } while (rows.length < ref.rowCount);
  throw new Error(`Incomplete pages for ${ref.id}`);
}
