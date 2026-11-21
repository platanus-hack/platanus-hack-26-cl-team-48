import {
  err,
  ok,
  type Column,
  type ColumnType,
  type NodeError,
  type Result,
} from "@nodomics/protocol";
import { COLUMN_TYPE_NAMES } from "./column-type-names.ts";
import type { FlatNode } from "./flat-graph.ts";
import { columnParamsOf, conditionsOf, type ColumnParam } from "./param-hints.ts";

/** The columns arriving at an input port, or `undefined` while they are unknown. */
export type InputColumns = (port: string) => ReadonlyArray<Column> | undefined;

/**
 * The node with the params that apply to its input columns (ADR 0013): drops the params whose
 * condition does not hold and reports a chosen column that is missing or of a type not accepted.
 */
export function applyInputColumns(
  node: FlatNode,
  columnsOf: InputColumns,
): Result<FlatNode, NodeError> {
  const applying = withoutInapplicableParams(node, columnsOf);
  const error = columnParamsOf(node.manifest)
    .map((column) => checkColumn(applying.params[column.param], column, columnsOf))
    .find((found) => found !== undefined);
  return error === undefined ? ok(applying) : err(error);
}

function withoutInapplicableParams(node: FlatNode, columnsOf: InputColumns): FlatNode {
  const columnParams = columnParamsOf(node.manifest);
  const dropped = conditionsOf(node.manifest)
    .filter(({ column, types }) => {
      const type = chosenColumnType(
        node,
        columnParams.find(({ param }) => param === column),
        columnsOf,
      );
      return type !== undefined && !types.includes(type);
    })
    .map(({ param }) => param);
  if (dropped.length === 0) return node;
  return {
    ...node,
    params: Object.fromEntries(
      Object.entries(node.params).filter(([param]) => !dropped.includes(param)),
    ),
  };
}

function chosenColumnType(
  node: FlatNode,
  column: ColumnParam | undefined,
  columnsOf: InputColumns,
): ColumnType | undefined {
  const name = column === undefined ? undefined : node.params[column.param];
  return column === undefined
    ? undefined
    : columnsOf(column.port)?.find((found) => found.name === name)?.type;
}

function checkColumn(
  value: unknown,
  column: ColumnParam,
  columnsOf: InputColumns,
): NodeError | undefined {
  const available = columnsOf(column.port);
  if (typeof value !== "string" || available === undefined) return undefined;
  const found = available.find(({ name }) => name === value);
  if (found === undefined)
    return {
      code: "COLUMN_NOT_FOUND",
      message: `No existe la columna "${value}"`,
      param: column.param,
    };
  if (column.types === undefined || column.types.includes(found.type)) return undefined;
  return {
    code: "TYPE_MISMATCH",
    message: `La columna "${value}" es ${COLUMN_TYPE_NAMES[found.type]}; aquí se espera ${describeTypes(column.types)}`,
    param: column.param,
  };
}

const describeTypes = (types: ReadonlyArray<ColumnType>): string => {
  const names = types.map((type) => COLUMN_TYPE_NAMES[type]);
  return names.length <= 1
    ? (names[0] ?? "")
    : `${names.slice(0, -1).join(", ")} o ${names.at(-1) ?? ""}`;
};
