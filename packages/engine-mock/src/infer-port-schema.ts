import type { FlowNode, NepResult } from "@nodomics/protocol";
import type { Catalog } from "./flow-issues.ts";
import { VENTAS } from "./ventas-dataset.ts";

/** Every table port in the mock carries the "ventas" columns; other ports have no columns. */
export function inferPortSchema(
  node: FlowNode,
  port: string,
  catalog: Catalog,
): NepResult<"schema.infer"> {
  const manifest = catalog.get(node.type);
  const spec = [...(manifest?.inputs ?? []), ...(manifest?.outputs ?? [])].find(
    (candidate) => candidate.id === port,
  );
  return spec?.type === "table"
    ? { ok: true, columns: [...VENTAS.columns] }
    : {
        ok: false,
        error: {
          code: "TYPE_MISMATCH",
          message: `El puerto "${port}" no es una tabla.`,
        },
      };
}
