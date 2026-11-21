import { nodePorts } from "@nodomics/protocol";
import type { DataType, Flow, FlowNode, NodeManifest, PortSpec } from "@nodomics/protocol";
import {
  ICONS,
  type Condition,
  type Engine,
  type IconName,
  type NodeProps,
  type PortProps,
} from "@nodomics/ui";
import type { EngineState, NodeRun } from "../engine/engine-state.ts";
import { toUiEngine, toUiExecState } from "../engine/ui-types.ts";
import { outputType } from "./connect-ports.ts";

type NodeVariant = NonNullable<NodeProps["variant"]>;

export type NodeView = {
  readonly id: string;
  readonly position: FlowNode["position"];
  readonly props: NodeProps;
  readonly handles: {
    readonly inputs: ReadonlyArray<string>;
    readonly outputs: ReadonlyArray<string>;
  };
};

export type EdgeView = {
  readonly id: string;
  readonly source: string;
  readonly sourceHandle: string;
  readonly target: string;
  readonly targetHandle: string;
  readonly type: DataType;
  readonly rows?: number;
  readonly columns?: number;
};

type ViewSources = {
  readonly flow: Flow;
  readonly catalog: ReadonlyArray<NodeManifest>;
  readonly engine: EngineState;
};

const VARIANTS_BY_IMPL: Partial<Record<NodeManifest["impl"]["kind"], NodeVariant>> = {
  flow: "subflow",
  builtin: "io",
  view: "view",
  python: "code",
};

const EXECUTOR_ENGINES: Readonly<Record<string, Engine>> = {
  "duckdb-wasm": "browser",
  pyodide: "browser",
  "python-local": "local",
};

const ISSUE_SEPARATOR = " · ";

/** What the canvas draws for each node: the flow being edited plus the engine's mirror. */
export function toNodeViews(sources: ViewSources): NodeView[] {
  return sources.flow.nodes.map((node) => {
    const manifest = sources.catalog.find((candidate) => candidate.id === node.type);
    return {
      id: node.id,
      position: node.position,
      props: describeNode(sources, node, manifest),
      handles: {
        inputs: (manifest === undefined ? [] : nodePorts(manifest, node.params).inputs).map(
          (port) => port.id,
        ),
        outputs: (manifest === undefined ? [] : nodePorts(manifest, node.params).outputs).map(
          (port) => port.id,
        ),
      },
    };
  });
}

export function toEdgeViews({ flow, catalog, engine }: ViewSources): EdgeView[] {
  return flow.edges.map((edge) => {
    const carried = engine.results[edge.from.node]?.[edge.from.port];
    return {
      id: edge.id,
      source: edge.from.node,
      sourceHandle: edge.from.port,
      target: edge.to.node,
      targetHandle: edge.to.port,
      type: outputType(flow, catalog, edge.from),
      ...(carried === undefined ? {} : { rows: carried.rowCount, columns: carried.schema.length }),
    };
  });
}

function describeNode(
  sources: ViewSources,
  node: FlowNode,
  manifest: NodeManifest | undefined,
): NodeProps {
  const ports =
    manifest === undefined ? { inputs: [], outputs: [] } : nodePorts(manifest, node.params);
  return {
    title: node.label ?? manifest?.name ?? node.type,
    ...describeIcon(manifest),
    variant: manifest === undefined ? "transform" : variantOf(manifest, node.params),
    inputs: describePorts(sources.flow, node, ports.inputs),
    outputs: describePorts(sources.flow, node, ports.outputs),
    ...describeRun(sources.engine.nodes[node.id]),
    ...describeIssues(sources.engine, node, manifest),
    ...describeResult(sources.engine, node),
    ...describeEngine(sources.engine, node.id),
  };
}

const VARIANT_ICONS: Record<NodeVariant, IconName> = {
  source: "database",
  transform: "filter",
  combine: "merge",
  code: "code",
  view: "chart-column",
  subflow: "boxes",
  io: "arrow-right-left",
};

/** Manifests are data from any author; only icons the design system can draw are used. */
export function iconOf(manifest: NodeManifest): IconName {
  const icon = manifest.icon;
  return icon !== undefined && isIconName(icon) ? icon : VARIANT_ICONS[variantOf(manifest)];
}

function describeIcon(manifest: NodeManifest | undefined): Partial<NodeProps> {
  return { icon: manifest === undefined ? VARIANT_ICONS.transform : iconOf(manifest) };
}

const isIconName = (name: string): name is IconName => Object.hasOwn(ICONS, name);

function variantOf(manifest: NodeManifest, params: FlowNode["params"] = {}): NodeVariant {
  const byImpl = VARIANTS_BY_IMPL[manifest.impl.kind];
  if (byImpl !== undefined) return byImpl;
  if (nodePorts(manifest, params).inputs.length === 0) return "source";
  return nodePorts(manifest, params).inputs.length > 1 ? "combine" : "transform";
}

function describePorts(flow: Flow, node: FlowNode, ports: ReadonlyArray<PortSpec>): PortProps[] {
  return ports.map((port) => ({
    type: port.type,
    connected: flow.edges.some(
      (edge) =>
        (edge.to.node === node.id && edge.to.port === port.id) ||
        (edge.from.node === node.id && edge.from.port === port.id),
    ),
    ...(port.name === undefined ? {} : { name: port.name }),
    ...(port.optional === undefined ? {} : { optional: port.optional }),
    ...(port.multi === undefined ? {} : { multi: port.multi }),
  }));
}

function describeRun(run: NodeRun | undefined): Partial<NodeProps> {
  return {
    state: toUiExecState(run?.state),
    ...(run?.progress === undefined ? {} : { progress: run.progress }),
    ...(run?.error === undefined ? {} : { errorMessage: run.error.message }),
  };
}

function describeIssues(
  engine: EngineState,
  node: FlowNode,
  manifest: NodeManifest | undefined,
): Partial<NodeProps> {
  if (manifest === undefined) return { conditions: ["missing"] satisfies Condition[] };
  const issues = engine.issues.filter((issue) => issue.nodeId === node.id);
  return issues.length === 0
    ? {}
    : {
        conditions: ["incomplete"],
        summary: issues.map((issue) => issue.message).join(ISSUE_SEPARATOR),
      };
}

function describeResult(engine: EngineState, node: FlowNode): Partial<NodeProps> {
  const ref = Object.values(engine.results[node.id] ?? {}).at(0);
  return ref === undefined ? {} : { rows: ref.rowCount, cols: ref.schema.length };
}

function describeEngine({ connection, nodes }: EngineState, nodeId: string): Partial<NodeProps> {
  const executor = nodes[nodeId]?.executor;
  const engine = executor === undefined ? undefined : EXECUTOR_ENGINES[executor];
  if (engine !== undefined) return { engine };
  return connection.status === "connected"
    ? { engine: toUiEngine(connection.capabilities.engine) }
    : {};
}
