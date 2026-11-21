import { err, ok, type DataPage, type Result, type SortSpec } from "@nodomics/protocol";
import { columnIndex, compareCells, type Row, type Table } from "./table.ts";

export type PageRequest = {
  readonly offset: number;
  readonly limit: number;
  readonly sort?: SortSpec;
};

const SORT_FACTOR = { asc: 1, desc: -1 } as const;

/** One window of `table`, sorted first when asked; fails only for an unknown sort column. */
export function pageTable(table: Table, request: PageRequest): Result<DataPage, string> {
  const sorted = request.sort === undefined ? ok(table.rows) : sortRows(table, request.sort);
  return sorted.ok
    ? ok({
        columns: [...table.columns],
        rows: sorted.value
          .slice(request.offset, request.offset + request.limit)
          .map((row) => [...row]),
        total: table.rows.length,
      })
    : sorted;
}

function sortRows(table: Table, sort: SortSpec): Result<readonly Row[], string> {
  const index = columnIndex(table, sort.column);
  return index < 0
    ? err(`Unknown sort column: ${sort.column}`)
    : ok(
        [...table.rows].sort(
          (left, right) =>
            compareCells(left[index] ?? null, right[index] ?? null) * SORT_FACTOR[sort.direction],
        ),
      );
}
