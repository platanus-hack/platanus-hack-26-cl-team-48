import type { EngineClient } from "@nodomics/client";
import { tableToCsv } from "./table-to-csv.ts";
import type { Table } from "./test-case.ts";

export async function uploadTables(
  client: EngineClient,
  tables: Readonly<Record<string, Table>>,
): Promise<Readonly<Record<string, string>>> {
  const sourceIds: Record<string, string> = {};
  for (const [id, table] of Object.entries(tables))
    sourceIds[id] = (
      await client.request("source.add", {
        kind: "upload",
        name: `${id}.csv`,
        file: tableToCsv(table),
      })
    ).sourceId;
  return sourceIds;
}
