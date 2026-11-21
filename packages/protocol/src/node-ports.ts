import type { NodeManifest, PortSpec } from "./manifest.ts";
import { parse } from "./parse.ts";
import { DataType } from "./primitives.ts";

const PORTS_WIDGET = "ports";
const ACCENTS = /\p{Diacritic}/gu;
const NOT_ID = /[^a-z0-9]+/g;
const EDGE_UNDERSCORES = /^_+|_+$/g;

export type NodePorts = Pick<NodeManifest, "inputs" | "outputs">;

/** The port id for a port named by the user: lowercase, unaccented, `_` for anything else. */
export const portIdOf = (name: string): string =>
  name
    .normalize("NFD")
    .replace(ACCENTS, "")
    .toLowerCase()
    .replace(NOT_ID, "_")
    .replace(EDGE_UNDERSCORES, "");

/**
 * The ports a node has with these params. A param with `x-nodomics: { widget: "ports" }` lists
 * `{ name, type }` items; each becomes an output and an input of the same id, through which the
 * node passes data (ADR 0016).
 */
export function nodePorts(
  manifest: NodeManifest,
  params: Readonly<Record<string, unknown>>,
): NodePorts {
  const declared = portParamsOf(manifest).flatMap((param) => declaredPorts(params[param]));
  return {
    inputs: uniqueById([...manifest.inputs, ...declared]),
    outputs: uniqueById([...manifest.outputs, ...declared]),
  };
}

const portParamsOf = (manifest: NodeManifest): ReadonlyArray<string> =>
  Object.entries(manifest.params.properties)
    .filter(([, property]) => widgetOf(property) === PORTS_WIDGET)
    .map(([name]) => name);

function widgetOf(property: unknown): unknown {
  if (!isRecord(property)) return undefined;
  const hint = property["x-nodomics"];
  return isRecord(hint) ? hint["widget"] : undefined;
}

const declaredPorts = (value: unknown): ReadonlyArray<PortSpec> =>
  Array.isArray(value) ? value.flatMap(toPort) : [];

function toPort(item: unknown): ReadonlyArray<PortSpec> {
  if (!isRecord(item) || typeof item["name"] !== "string") return [];
  const type = parse(DataType, item["type"]);
  const id = portIdOf(item["name"]);
  return type.ok && id !== "" ? [{ id, name: item["name"], type: type.value }] : [];
}

const uniqueById = (ports: ReadonlyArray<PortSpec>): PortSpec[] =>
  ports.filter((port, index) => ports.findIndex((other) => other.id === port.id) === index);

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
