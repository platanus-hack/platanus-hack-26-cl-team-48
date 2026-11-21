import type { Column, ColumnType } from "@nodomics/protocol";
import { MESSAGES } from "../messages.ts";
import type { FieldCondition, FormField } from "./form-fields.ts";

/** The columns known at each input port; a port missing from the map has unknown columns. */
export type ColumnsByPort = ReadonlyMap<string, ReadonlyArray<Column>>;

type Params = Readonly<Record<string, unknown>>;

/** What is wrong with the column chosen in a field, said the way the engine says it (ADR 0013). */
export function columnIssue(
  field: FormField,
  value: unknown,
  columns: ColumnsByPort,
): string | undefined {
  if (field.widget.kind !== "column" || typeof value !== "string") return undefined;
  const available = columns.get(field.widget.port);
  if (available === undefined || available.length === 0) return undefined;
  const found = available.find(({ name }) => name === value);
  if (found === undefined) return MESSAGES.params.columnMissing(value);
  const { types } = field.widget;
  return types === undefined || types.includes(found.type)
    ? undefined
    : MESSAGES.params.columnType(value, typeName(found.type), describeTypes(types));
}

/** Whether a field applies; a condition on a column whose type is still unknown holds. */
export function appliesTo(
  condition: FieldCondition | undefined,
  context: {
    readonly fields: ReadonlyArray<FormField>;
    readonly params: Params;
    readonly columns: ColumnsByPort;
  },
): boolean {
  if (condition === undefined) return true;
  const column = context.fields.find(({ name }) => name === condition.param);
  if (column?.widget.kind !== "column") return true;
  const chosen = context.params[condition.param];
  if (typeof chosen !== "string") return false;
  const type = context.columns.get(column.widget.port)?.find(({ name }) => name === chosen)?.type;
  return type === undefined || condition.types.includes(type);
}

const typeName = (type: ColumnType) => MESSAGES.params.columnTypes[type];

const describeTypes = (types: ReadonlyArray<ColumnType>): string => {
  const names = types.map(typeName);
  return names.length <= 1
    ? (names[0] ?? "")
    : `${names.slice(0, -1).join(", ")} o ${names.at(-1) ?? ""}`;
};
