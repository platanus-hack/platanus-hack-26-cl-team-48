import { Column, parse, type NodeError } from "@nodomics/protocol";
import { COLUMN_TYPE_NAMES } from "./column-type-names.ts";
import type { FlatNode } from "./flat-graph.ts";
import { displayRequirementsOf, portSchemaParamsOf } from "./param-hints.ts";
import type { NodeRun } from "./result-store.ts";

/** The columns a node's params declare for a port (ADR 0014), or `undefined` if none are declared. */
export function declaredColumns(node: FlatNode, port: string): ReadonlyArray<Column> | undefined {
  const declaration = portSchemaParamsOf(node.manifest).find((found) => found.port === port);
  const value = declaration === undefined ? undefined : node.params[declaration.param];
  const columns = Array.isArray(value) ? value.flatMap(parseColumn) : [];
  return columns.length > 0 ? columns : undefined;
}

/** How a node's run breaks what its params declare, if it does. */
export function checkOutputContract(node: FlatNode, run: NodeRun): NodeError | undefined {
  return (
    portSchemaParamsOf(node.manifest)
      .map(({ param, port }) =>
        checkPort(declaredColumns(node, port), run.outputs[port]?.schema, param),
      )
      .find((error) => error !== undefined) ?? checkDisplays(node, run)
  );
}

function checkPort(
  declared: ReadonlyArray<Column> | undefined,
  produced: ReadonlyArray<Column> | undefined,
  param: string,
): NodeError | undefined {
  if (declared === undefined || produced === undefined) return undefined;
  for (const { name, type } of declared) {
    const found = produced.find((column) => column.name === name);
    if (found === undefined)
      return {
        code: "COLUMN_NOT_FOUND",
        message: `El resultado no tiene la columna "${name}"`,
        param,
      };
    if (found.type !== type)
      return {
        code: "TYPE_MISMATCH",
        message: `La columna "${name}" del resultado es ${COLUMN_TYPE_NAMES[found.type]}; se declaró ${COLUMN_TYPE_NAMES[type]}`,
        param,
      };
  }
  return undefined;
}

function checkDisplays(node: FlatNode, run: NodeRun): NodeError | undefined {
  const param = displayRequirementsOf(node.manifest).find((name) => node.params[name] === true);
  return param === undefined || run.displays.length > 0
    ? undefined
    : {
        code: "TYPE_MISMATCH",
        message: "El nodo no mostró ningún gráfico",
        hint: "En Python, dibuja el gráfico y llama a plt.show()",
        param,
      };
}

const parseColumn = (value: unknown): Column[] => {
  const parsed = parse(Column, value);
  return parsed.ok ? [parsed.value] : [];
};
