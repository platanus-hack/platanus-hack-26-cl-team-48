import type { Column, SortSpec } from "@nodomics/protocol";
import type { GridColumn } from "@nodomics/ui";
import { toUiColumnType } from "../engine/ui-types.ts";

/** Rows per `data.page` request; the protocol caps pages at 1000. */
export const PAGE_SIZE = 100;

export function toGridColumns(
  columns: ReadonlyArray<Column>,
  sort: SortSpec | undefined,
): GridColumn[] {
  return columns.map((column) => ({
    name: column.name,
    type: toUiColumnType(column.type),
    ...(sort?.column === column.name ? { sorted: sort.direction } : {}),
  }));
}

/** The offset of the page `step` pages away, kept inside the result. */
export function nextPage(
  window: { readonly offset: number; readonly total: number },
  step: number,
) {
  const lastPage = Math.max(0, Math.ceil(window.total / PAGE_SIZE) - 1) * PAGE_SIZE;
  return Math.min(Math.max(0, window.offset + step * PAGE_SIZE), lastPage);
}
