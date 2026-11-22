import type { Flow, FlowEdge, FlowNode, NodeManifest, PortSpec, Result } from "@nodomics/protocol";

const TEST_VERSION = "0.1.0";
export const VALID_ID = /^[A-Za-z0-9_.-]{1,64}$/;

type ManifestSpec = {
  readonly id: string;
  readonly name?: string;
  readonly inputs?: readonly PortSpec[];
  readonly outputs?: readonly PortSpec[];
  readonly properties?: Readonly<Record<string, unknown>>;
  readonly required?: readonly string[];
};

const table = (id: string, optional = false): PortSpec =>
  optional ? { id, type: "table", optional } : { id, type: "table" };

export function manifest(spec: ManifestSpec): NodeManifest {
  return {
    id: spec.id,
    version: TEST_VERSION,
    name: spec.name ?? spec.id,
    category: "Test",
    inputs: [...(spec.inputs ?? [])],
    outputs: [...(spec.outputs ?? [])],
    params: {
      type: "object",
      properties: { ...(spec.properties ?? {}) },
      ...(spec.required ? { required: [...spec.required] } : {}),
    },
    impl: { kind: "sql", template: "SELECT 1" },
  };
}

export const sourceManifest = manifest({
  id: "t.source",
  name: "Source",
  outputs: [table("out")],
  properties: {
    rows: {
      title: "Filas",
      type: "integer",
      minimum: 1,
      maximum: 10,
      default: 5,
      "x-unit": "filas",
    },
    label: { type: "string" },
  },
});

export const transformManifest = manifest({
  id: "t.transform",
  inputs: [table("in")],
  outputs: [table("out")],
  properties: {
    n: { type: "integer", minimum: 0, maximum: 10, default: 3 },
    mode: { enum: ["a", "b"], default: "a" },
    kind: { oneOf: [{ const: "x" }, { const: "y" }] },
    name: { type: "string", minLength: 1 },
    flag: { type: "boolean" },
    ratio: { type: "number" },
    tags: { type: "array", items: { type: "string" } },
  },
  required: ["name"],
});

export const joinManifest = manifest({
  id: "t.join",
  inputs: [table("left"), table("right", true)],
  outputs: [table("out")],
});

export const dynamicManifest = manifest({
  id: "t.dynamic",
  properties: {
    ports: {
      type: "array",
      items: { type: "object" },
      "x-nodomics": { widget: "ports" },
    },
  },
});

export const testCatalog: readonly NodeManifest[] = [
  sourceManifest,
  transformManifest,
  joinManifest,
  dynamicManifest,
];

export const node = (
  id: string,
  type: string,
  params: Readonly<Record<string, unknown>> = {},
): FlowNode => ({
  id,
  type,
  version: TEST_VERSION,
  params: { ...params },
  position: { x: 0, y: 0 },
});

export function edge(from: string, to: string): FlowEdge {
  const [fromNode = "", fromPort = ""] = from.split(".");
  const [toNode = "", toPort = ""] = to.split(".");
  return {
    id: `${fromNode}_${fromPort}-${toNode}_${toPort}`,
    from: { node: fromNode, port: fromPort },
    to: { node: toNode, port: toPort },
  };
}

export const flowOf = (
  nodes: readonly FlowNode[],
  edges: readonly FlowEdge[] = [],
  customNodes?: readonly NodeManifest[],
): Flow => ({
  format: "nodomics/flow@0",
  nodes: [...nodes],
  edges: [...edges],
  ...(customNodes ? { customNodes: [...customNodes] } : {}),
});

/** A valid flow over `testCatalog`: source -> transform. */
export const pipelineFlow = (): Flow =>
  flowOf(
    [node("src", "t.source", { rows: 5 }), node("tr", "t.transform", { n: 3, name: "x" })],
    [edge("src.out", "tr.in")],
  );

export function unwrap<T>(result: Result<T, { readonly message: string }>): T {
  if (!result.ok) throw new Error(`Expected ok, got error: ${result.error.message}`);
  return result.value;
}

export function errorOf<T>(result: Result<T, { readonly message: string }>): string {
  if (result.ok) throw new Error("Expected an error, got ok");
  return result.error.message;
}

export const edgeEnds = (flow: Flow): readonly string[] =>
  flow.edges.map((e) => `${e.from.node}.${e.from.port}->${e.to.node}.${e.to.port}`);

export const nodeById = (flow: Flow, id: string): FlowNode | undefined =>
  flow.nodes.find((n) => n.id === id);

export function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}
