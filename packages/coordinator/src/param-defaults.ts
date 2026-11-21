import type { NodeManifest } from "@nodomics/protocol";

type Params = Readonly<Record<string, unknown>>;

/**
 * Params with each missing top-level property set to its schema `default`, if it declares one. A
 * param cleared to `null` keeps no value and gets no default (ADR 0013).
 */
export const applyParamDefaults = (schema: NodeManifest["params"], params: Params): Params =>
  Object.fromEntries(
    Object.entries({
      ...Object.fromEntries(Object.entries(schema.properties).flatMap(defaultEntry)),
      ...params,
    }).filter(([, value]) => value !== null),
  );

function defaultEntry([name, property]: [string, unknown]): Array<[string, unknown]> {
  return property !== null && typeof property === "object" && "default" in property
    ? [[name, property.default]]
    : [];
}
