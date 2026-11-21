import type { ColumnType } from "@nodomics/protocol";

/** How a column type is named in messages to the user. */
export const COLUMN_TYPE_NAMES: Readonly<Record<ColumnType, string>> = {
  number: "número",
  text: "texto",
  date: "fecha",
  bool: "verdadero o falso",
  geo: "geografía",
  other: "otro tipo",
};
