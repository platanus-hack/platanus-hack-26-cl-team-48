import { ColumnType, parse, type NodeManifest } from "@nodomics/protocol";

/** A param that names a column of an input port, and the column types it accepts (ADR 0013). */
export type ColumnParam = {
  readonly param: string;
  readonly port: string;
  readonly types: ReadonlyArray<ColumnType> | undefined;
};

/** A param that applies only while the column chosen in another param has one of `types`. */
export type ParamCondition = {
  readonly param: string;
  readonly column: string;
  readonly types: ReadonlyArray<ColumnType>;
};

/** A param that declares the columns a port must produce (ADR 0014). */
export type PortSchemaParam = { readonly param: string; readonly port: string };

const DEFAULT_PORT = "in";

export const columnParamsOf = (manifest: NodeManifest): ColumnParam[] =>
  hintsOf(manifest).flatMap(([param, hint]) =>
    hint["widget"] === "column"
      ? [{ param, port: textOr(hint["of"], DEFAULT_PORT), types: columnTypesOf(hint["types"]) }]
      : [],
  );

export const conditionsOf = (manifest: NodeManifest): ParamCondition[] =>
  hintsOf(manifest).flatMap(([param, hint]) => {
    const when = hint["when"];
    if (!isRecord(when) || typeof when["param"] !== "string") return [];
    return [{ param, column: when["param"], types: columnTypesOf(when["types"]) ?? [] }];
  });

export const portSchemaParamsOf = (manifest: NodeManifest): PortSchemaParam[] =>
  hintsOf(manifest).flatMap(([param, hint]) =>
    hint["widget"] === "port-schema" && typeof hint["port"] === "string"
      ? [{ param, port: hint["port"] }]
      : [],
  );

/** Boolean params that, when true, require the node to show at least one figure. */
export const displayRequirementsOf = (manifest: NodeManifest): string[] =>
  hintsOf(manifest).flatMap(([param, hint]) => (hint["requires"] === "display" ? [param] : []));

function hintsOf(
  manifest: NodeManifest,
): Array<readonly [string, Readonly<Record<string, unknown>>]> {
  return Object.entries(manifest.params.properties).flatMap(([param, property]) => {
    const hint = isRecord(property) ? property["x-nodomics"] : undefined;
    return isRecord(hint) ? [[param, hint] as const] : [];
  });
}

const columnTypesOf = (value: unknown): ReadonlyArray<ColumnType> | undefined =>
  Array.isArray(value)
    ? value.flatMap((type) => {
        const parsed = parse(ColumnType, type);
        return parsed.ok ? [parsed.value] : [];
      })
    : undefined;

const textOr = (value: unknown, fallback: string): string =>
  typeof value === "string" ? value : fallback;

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
