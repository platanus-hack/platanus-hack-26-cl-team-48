import { DataType, type Field, type Schema } from "apache-arrow";
import type { Column, ColumnType } from "@nodomics/protocol";

/** Maps an Arrow type, as DuckDB returns it, to the column types the protocol exposes. */
export function toColumnType(type: DataType): ColumnType {
  if (DataType.isInt(type) || DataType.isFloat(type) || DataType.isDecimal(type)) return "number";
  if (DataType.isUtf8(type) || DataType.isLargeUtf8(type)) return "text";
  if (DataType.isBool(type)) return "bool";
  if (DataType.isDate(type) || DataType.isTimestamp(type)) return "date";
  return "other";
}

export const toColumns = (schema: Schema): Column[] =>
  schema.fields.map((field: Field<DataType>) => ({
    name: field.name,
    type: toColumnType(field.type),
  }));
