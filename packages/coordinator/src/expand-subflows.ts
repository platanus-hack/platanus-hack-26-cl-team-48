import {
  err,
  nodePorts,
  ok,
  portIdOf,
  type ConfigIssue,
  type Flow,
  type FlowEdge,
  type FlowGraph,
  type FlowNode,
  type NodeManifest,
  type NodeImpl,
  type PortRef,
  type Result,
} from "@nodomics/protocol";
import type { Catalog } from "./catalog.ts";
import { withExposedParams } from "./exposed-params.ts";
import type { FlatGraph, FlatNode } from "./flat-graph.ts";

const ID_SEPARATOR = ".";
const BOUNDARY_PORT_PARAM = "name";

type Boundary = {
  readonly inputs: ReadonlyMap<string, ReadonlyArray<PortRef>>;
  readonly outputs: ReadonlyMap<string, PortRef>;
  /** Output port → input port, for an output connected straight to the node entry. */
  readonly passThrough: ReadonlyMap<string, string>;
};

type Expansion = FlatGraph & { readonly boundary: Boundary };

type NodeExpansion =
  | { readonly kind: "simple"; readonly node: FlatNode }
  | { readonly kind: "composite"; readonly id: string; readonly expansion: Expansion }
  /** `portFor` names the composite port that an edge leaving this input node stands for. */
  | { readonly kind: "input"; readonly portFor: (port: string) => string }
  | { readonly kind: "output"; readonly port: string };

type Expansions = ReadonlyMap<string, NodeExpansion>;

/** The expanded nodes of one level and the edges between them, as the flow wrote them. */
type Wiring = { readonly expansions: Expansions; readonly edges: ReadonlyArray<FlowEdge> };

type Level = {
  readonly catalog: Catalog;
  readonly prefix: string;
  readonly origin: string | undefined;
};

/**
 * Flattens composite nodes (`impl.kind = "flow"`) into their inner nodes, recursively. Inner ids
 * are prefixed with the composite id, and the composite's ports are reconnected through its
 * `flow.input`, `flow.node` and `flow.output` nodes. A `flow.input`/`flow.output` node names the
 * composite port it stands for with its `name` param (its own id when absent); a `flow.node`
 * stands for one composite port per port it declares. In the flow being edited, a `flow.node` is a
 * node that passes its test data through and a `flow.output` one that only waits for its input
 * (ADR 0016).
 */
export function expandSubflows(flow: Flow, catalog: Catalog): Result<FlatGraph, ConfigIssue[]> {
  const issues = findExpansionIssues(flow, { catalog, prefix: "", ancestors: [] });
  if (issues.length > 0) return err(issues);
  const { nodes, edges, composites } = expandLevel(flow, {
    catalog,
    prefix: "",
    origin: undefined,
  });
  return ok({ nodes, edges, composites: composites ?? [] });
}

type ValidationLevel = {
  readonly catalog: Catalog;
  readonly prefix: string;
  readonly ancestors: ReadonlyArray<string>;
};

function findExpansionIssues(graph: FlowGraph, level: ValidationLevel): ConfigIssue[] {
  return graph.nodes.flatMap((node) => {
    const manifest = level.catalog.get(node.type);
    if (manifest === undefined) return [unknownTypeIssue(`${level.prefix}${node.id}`, node.type)];
    if (manifest.impl.kind === "builtin" && !Object.hasOwn(BOUNDARIES, manifest.impl.name))
      return [unknownTypeIssue(`${level.prefix}${node.id}`, manifest.impl.name)];
    if (level.ancestors.includes(node.type))
      return [
        {
          nodeId: `${level.prefix}${node.id}`,
          code: "CYCLE",
          message: "El nodo compuesto se contiene a sí mismo",
        },
      ];
    return manifest.impl.kind === "flow"
      ? findExpansionIssues(manifest.impl.graph, {
          ...level,
          prefix: innerPrefix(level.prefix, node.id),
          ancestors: [...level.ancestors, node.type],
        })
      : [];
  });
}

function expandLevel(graph: FlowGraph, level: Level): Expansion {
  const expansions: Expansions = new Map(
    graph.nodes.map((node) => [node.id, expandNode(node, level)]),
  );
  const wiring = { expansions, edges: graph.edges };
  return {
    nodes: [...expansions.values()].flatMap(nodesOf),
    composites: [...expansions.values()].flatMap(projectionsOf),
    edges: [
      ...[...expansions.values()].flatMap(innerEdgesOf),
      ...graph.edges.flatMap((edge) => rewireEdge(edge, wiring, level.prefix)),
    ],
    boundary: {
      inputs: collectBoundaryInputs(graph.edges, expansions),
      outputs: collectBoundaryOutputs(wiring),
      passThrough: collectPassThrough(wiring),
    },
  };
}

type ImplByKind = { [K in NodeImpl["kind"]]: Extract<NodeImpl, { kind: K }> };
type ManifestOf<K extends NodeImpl["kind"]> = Omit<NodeManifest, "impl"> & {
  readonly impl: ImplByKind[K];
};
type Expanders = {
  [K in NodeImpl["kind"]]: (node: FlowNode, manifest: ManifestOf<K>, level: Level) => NodeExpansion;
};
type Expander = (node: FlowNode, manifest: NodeManifest, level: Level) => NodeExpansion;

const expandSimple: Expander = (node, manifest, level) => ({
  kind: "simple",
  node: toFlatNode(node, manifest, level),
});

const BOUNDARIES: Readonly<Record<ImplByKind["builtin"]["name"], Expander>> = {
  "flow.input": (node) => ({ kind: "input", portFor: () => boundaryPort(node) }),
  // The port of a node output is the id of its name, as the node's manifest declares it (ADR 0016).
  "flow.output": (node, manifest, level) =>
    level.origin === undefined
      ? expandSimple(node, manifest, level)
      : { kind: "output", port: portIdOf(boundaryPort(node)) || portIdOf(node.id) },
  "flow.node": (node, manifest, level) =>
    level.origin === undefined
      ? expandSimple(node, manifest, level)
      : { kind: "input", portFor: (port) => port },
};

const EXPANDERS: Expanders = {
  sql: expandSimple,
  python: expandSimple,
  view: expandSimple,
  builtin: (node, manifest, level) => BOUNDARIES[manifest.impl.name](node, manifest, level),
  flow: (node, manifest, level) => {
    return {
      kind: "composite",
      id: `${level.prefix}${node.id}`,
      expansion: expandLevel(withExposedParams(manifest.impl.graph, node.params, level.catalog), {
        catalog: level.catalog,
        prefix: innerPrefix(level.prefix, node.id),
        origin: level.origin ?? node.id,
      }),
    };
  },
};

function expandNode(node: FlowNode, level: Level): NodeExpansion {
  const manifest = requireManifest(level.catalog, node.type);
  return dispatchExpansion(node, manifest, level);
}

const projectionsOf = (expansion: NodeExpansion) =>
  expansion.kind === "composite"
    ? [
        {
          id: expansion.id,
          nodes: expansion.expansion.nodes.map((node) => node.id),
          outputs: expansion.expansion.boundary.outputs,
        },
        ...(expansion.expansion.composites ?? []),
      ]
    : [];

const toFlatNode = (node: FlowNode, manifest: NodeManifest, level: Level): FlatNode => ({
  id: `${level.prefix}${node.id}`,
  origin: level.origin ?? node.id,
  type: node.type,
  version: node.version,
  params: node.params,
  manifest: { ...manifest, ...nodePorts(manifest, node.params) },
});

const nodesOf = (expansion: NodeExpansion): ReadonlyArray<FlatNode> =>
  expansion.kind === "simple"
    ? [expansion.node]
    : expansion.kind === "composite"
      ? expansion.expansion.nodes
      : [];

const innerEdgesOf = (expansion: NodeExpansion): ReadonlyArray<FlowEdge> =>
  expansion.kind === "composite" ? expansion.expansion.edges : [];

function rewireEdge(edge: FlowEdge, wiring: Wiring, prefix: string): FlowEdge[] {
  const targets = targetRefs(wiring.expansions, edge.to);
  return sourceRefs(wiring, edge.from).flatMap((from) =>
    targets.map((to, index) => ({
      id:
        index === 0 ? `${prefix}${edge.id}` : `${prefix}${edge.id}${ID_SEPARATOR}${String(index)}`,
      from,
      to,
    })),
  );
}

function sourceRefs(wiring: Wiring, ref: PortRef): ReadonlyArray<PortRef> {
  const expansion = wiring.expansions.get(ref.node);
  if (expansion?.kind === "simple") return [{ node: expansion.node.id, port: ref.port }];
  if (expansion?.kind !== "composite") return [];
  const { outputs, passThrough } = expansion.expansion.boundary;
  const input = passThrough.get(ref.port);
  return input === undefined
    ? listOf(outputs.get(ref.port))
    : sourcesInto(wiring, { node: ref.node, port: input });
}

/** What feeds an input port of this level, followed through composites. */
const sourcesInto = (wiring: Wiring, to: PortRef): ReadonlyArray<PortRef> =>
  wiring.edges
    .filter((edge) => edge.to.node === to.node && edge.to.port === to.port)
    .flatMap((edge) => sourceRefs(wiring, edge.from));

function targetRefs(expansions: Expansions, ref: PortRef): ReadonlyArray<PortRef> {
  const expansion = expansions.get(ref.node);
  if (expansion?.kind === "simple") return [{ node: expansion.node.id, port: ref.port }];
  if (expansion?.kind === "composite")
    return expansion.expansion.boundary.inputs.get(ref.port) ?? [];
  return [];
}

function collectBoundaryInputs(
  edges: ReadonlyArray<FlowEdge>,
  expansions: Expansions,
): ReadonlyMap<string, ReadonlyArray<PortRef>> {
  const inputs = new Map<string, ReadonlyArray<PortRef>>();
  edges.forEach((edge) => {
    const expansion = expansions.get(edge.from.node);
    const port = expansion?.kind === "input" ? expansion.portFor(edge.from.port) : undefined;
    if (port !== undefined)
      inputs.set(port, [...(inputs.get(port) ?? []), ...targetRefs(expansions, edge.to)]);
  });
  return inputs;
}

function collectBoundaryOutputs(wiring: Wiring): ReadonlyMap<string, PortRef> {
  return new Map(
    wiring.edges.flatMap((edge) => {
      const port = outputPortOf(wiring.expansions, edge);
      return port === undefined
        ? []
        : sourceRefs(wiring, edge.from).map((ref) => [port, ref] as const);
    }),
  );
}

function collectPassThrough(wiring: Wiring): ReadonlyMap<string, string> {
  return new Map(
    wiring.edges.flatMap((edge) => {
      const from = wiring.expansions.get(edge.from.node);
      const port = outputPortOf(wiring.expansions, edge);
      return from?.kind === "input" && port !== undefined
        ? [[port, from.portFor(edge.from.port)] as const]
        : [];
    }),
  );
}

function outputPortOf(expansions: Expansions, edge: FlowEdge): string | undefined {
  const expansion = expansions.get(edge.to.node);
  return expansion?.kind === "output" ? expansion.port : undefined;
}

function boundaryPort(node: FlowNode): string {
  const port = node.params[BOUNDARY_PORT_PARAM];
  return typeof port === "string" ? port : node.id;
}

function requireManifest(catalog: Catalog, type: string): NodeManifest {
  const manifest = catalog.get(type);
  if (manifest === undefined) throw new Error(`Unknown node type after validation: ${type}`);
  return manifest;
}

const innerPrefix = (prefix: string, nodeId: string) => `${prefix}${nodeId}${ID_SEPARATOR}`;

const listOf = <T>(value: T | undefined): ReadonlyArray<T> => (value === undefined ? [] : [value]);

const unknownTypeIssue = (nodeId: string, type: string): ConfigIssue => ({
  nodeId,
  code: "UNKNOWN_NODE_TYPE",
  message: `El tipo de nodo "${type}" no está disponible en este motor`,
});

function dispatchExpansion<K extends NodeImpl["kind"]>(
  node: FlowNode,
  manifest: ManifestOf<K>,
  level: Level,
): NodeExpansion {
  return EXPANDERS[manifest.impl.kind](node, manifest, level);
}
