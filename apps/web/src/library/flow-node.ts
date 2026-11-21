import {
  err,
  nodePorts,
  ok,
  portIdOf,
  type Flow,
  type FlowEdge,
  type FlowNode,
  type NodeManifest,
  type PortSpec,
  type Result,
} from "@nodomics/protocol";

export const MY_NODES_CATEGORY = "Mis nodos";
export const MY_NODE_PREFIX = "mine.";
const MY_NODE_ICON = "workflow";
const NODE_ENTRY = "flow.node";
const NODE_OUTPUT = "flow.output";
const COLUMN_WIDGETS: ReadonlyArray<unknown> = ["column", "column-list"];

/** Why a saved flow cannot be used as a node (ADR 0016). */
export type FlowNodeIssue =
  | "no-entry"
  | "many-entries"
  | "no-name"
  | "no-outputs"
  | "repeated-outputs"
  | "repeated-inputs"
  | "uses-itself";

export type FlowAsNode = { readonly id: string; readonly version: string; readonly flow: Flow };

type Catalog = ReadonlyArray<NodeManifest>;

type Parts = {
  readonly flow: Flow;
  readonly catalog: Catalog;
  readonly entry: FlowNode;
  readonly outputs: ReadonlyArray<FlowNode>;
};

export const myNodeId = (flowId: string) => `${MY_NODE_PREFIX}${flowId}`;

/** The manifest of the node a saved flow defines with its node entry and outputs. */
export function nodeFromFlow(
  saved: FlowAsNode,
  catalog: Catalog,
): Result<NodeManifest, FlowNodeIssue> {
  const parts = findParts(saved.flow, catalog);
  if (!parts.ok) return parts;
  const name = textParam(parts.value.entry, "name").trim();
  if (name === "") return err("no-name");
  if (saved.flow.nodes.some((node) => node.type === myNodeId(saved.id))) return err("uses-itself");
  if (hasInvalidInputs(parts.value.entry)) return err("repeated-inputs");
  const outputs = outputPorts(parts.value);
  if (new Set(outputs.map(({ id }) => id)).size < outputs.length) return err("repeated-outputs");
  return ok(assembleManifest(saved, parts.value, { name, outputs }));
}

function findParts(flow: Flow, catalog: Catalog): Result<Parts, FlowNodeIssue> {
  const entries = nodesOfBuiltin(flow, catalog, NODE_ENTRY);
  const outputs = nodesOfBuiltin(flow, catalog, NODE_OUTPUT);
  const [entry] = entries;
  if (entry === undefined) return err("no-entry");
  if (entries.length > 1) return err("many-entries");
  return outputs.length === 0 ? err("no-outputs") : ok({ flow, catalog, entry, outputs });
}

function assembleManifest(
  saved: FlowAsNode,
  parts: Parts,
  { name, outputs }: { readonly name: string; readonly outputs: ReadonlyArray<PortSpec> },
): NodeManifest {
  const description = textParam(parts.entry, "description").trim();
  const graph = innerGraph(parts);
  return {
    id: myNodeId(saved.id),
    version: saved.version,
    name,
    ...(description === "" ? {} : { description }),
    category: MY_NODES_CATEGORY,
    icon: MY_NODE_ICON,
    inputs: portsOf(parts.catalog, parts.entry).outputs,
    outputs: [...outputs],
    params: {
      type: "object",
      properties: exposedParams({ ...parts, flow: { ...parts.flow, ...graph } }),
    },
    impl: { kind: "flow", graph },
  };
}

function outputPorts(parts: Parts): PortSpec[] {
  return parts.outputs.map((output) => {
    const name = textParam(output, "name").trim() || output.id;
    return { id: portIdOf(name) || portIdOf(output.id), name, type: connectedType(parts, output) };
  });
}

function connectedType(parts: Parts, output: FlowNode): PortSpec["type"] {
  const from = parts.flow.edges.find((edge) => edge.to.node === output.id)?.from;
  const node = parts.flow.nodes.find((candidate) => candidate.id === from?.node);
  if (node === undefined) return "any";
  return portsOf(parts.catalog, node).outputs.find((port) => port.id === from?.port)?.type ?? "any";
}

/** The nodes the outputs depend on, without crossing the entry: its test data stays behind. */
function innerGraph({ flow, entry, outputs }: Parts): Pick<Flow, "nodes" | "edges"> {
  const kept = new Set<string>();
  const visit = (nodeId: string) => {
    if (kept.has(nodeId)) return;
    kept.add(nodeId);
    if (nodeId !== entry.id)
      flow.edges
        .filter((edge) => edge.to.node === nodeId)
        .forEach((edge) => {
          visit(edge.from.node);
        });
  };
  outputs.forEach((output) => {
    visit(output.id);
  });
  kept.add(entry.id);
  return {
    nodes: flow.nodes.filter((node) => kept.has(node.id)),
    edges: flow.edges.filter(
      (edge) => kept.has(edge.from.node) && kept.has(edge.to.node) && edge.to.node !== entry.id,
    ),
  };
}

export type ExposedParam = {
  readonly id: string;
  readonly title: string;
  readonly node: string;
  readonly param: string;
};

function exposedParams(parts: Parts): Record<string, unknown> {
  return Object.fromEntries(
    exposedParamsOf(parts.entry).flatMap((exposed) => {
      const schema = exposedSchema(parts, exposed);
      return schema === undefined ? [] : [[exposed.id, schema]];
    }),
  );
}

function exposedSchema(parts: Parts, exposed: ExposedParam): Record<string, unknown> | undefined {
  const node = parts.flow.nodes.find((candidate) => candidate.id === exposed.node);
  const inner = manifestOf(parts.catalog, node)?.params.properties[exposed.param];
  if (node === undefined || !isRecord(inner)) return undefined;
  const { "x-nodomics": hint, ...schema } = inner;
  const value = node.params[exposed.param];
  return {
    ...schema,
    title: exposed.title,
    ...(value === undefined ? {} : { default: value }),
    ...remappedHint(parts, node, hint),
  };
}

/** A column hint names a port of the inner node; it carries over only if the entry feeds that port. */
function remappedHint(parts: Parts, node: FlowNode, hint: unknown): Record<string, unknown> {
  if (!isRecord(hint)) return {};
  if (!COLUMN_WIDGETS.includes(hint["widget"])) return { "x-nodomics": hint };
  const feeding = parts.flow.edges.find(
    (edge: FlowEdge) =>
      edge.to.node === node.id && edge.to.port === hint["of"] && edge.from.node === parts.entry.id,
  );
  return feeding === undefined ? {} : { "x-nodomics": { ...hint, of: feeding.from.port } };
}

export const exposedParamsOf = (entry: Pick<FlowNode, "params">): ReadonlyArray<ExposedParam> => {
  const value = entry.params["params"];
  return Array.isArray(value) ? value.filter(isExposedParam) : [];
};

function isExposedParam(item: unknown): item is ExposedParam {
  return (
    isRecord(item) && ["id", "title", "node", "param"].every((key) => typeof item[key] === "string")
  );
}

const nodesOfBuiltin = (flow: Flow, catalog: Catalog, name: string) =>
  flow.nodes.filter((node) => {
    const impl = manifestOf(catalog, node)?.impl;
    return impl?.kind === "builtin" && impl.name === name;
  });

const manifestOf = (catalog: Catalog, node: FlowNode | undefined) =>
  catalog.find((manifest) => manifest.id === node?.type);

const portsOf = (catalog: Catalog, node: FlowNode) => {
  const manifest = manifestOf(catalog, node);
  return manifest === undefined ? { inputs: [], outputs: [] } : nodePorts(manifest, node.params);
};

const textParam = (node: FlowNode, param: string): string => {
  const value = node.params[param];
  return typeof value === "string" ? value : "";
};

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function hasInvalidInputs(entry: FlowNode): boolean {
  const inputs = entry.params["inputs"];
  if (!Array.isArray(inputs)) return false;
  const ids = inputs
    .filter(isRecord)
    .map((input) => portIdOf(typeof input["name"] === "string" ? input["name"] : ""));
  return ids.includes("") || new Set(ids).size !== ids.length;
}
