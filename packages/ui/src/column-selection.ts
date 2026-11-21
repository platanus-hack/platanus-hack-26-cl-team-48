import type { ColumnType } from "./types.ts";

type TypedColumn = { readonly name: string; readonly type: ColumnType };

export function isOffered(
  column: TypedColumn,
  filterType: ReadonlyArray<ColumnType> | undefined,
): boolean {
  return filterType === undefined || filterType.includes(column.type);
}

export function offeredColumnNames(
  columns: ReadonlyArray<TypedColumn>,
  filterType: ReadonlyArray<ColumnType> | undefined,
): ReadonlyArray<string> {
  return columns.filter((column) => isOffered(column, filterType)).map((column) => column.name);
}

export function toggleColumn(selected: ReadonlyArray<string>, name: string): ReadonlyArray<string> {
  return selected.includes(name)
    ? selected.filter((selectedName) => selectedName !== name)
    : [...selected, name];
}
