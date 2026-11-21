import { ok, type NodeError, type NodeImpl, type Result, type Runtime } from "@nodomics/protocol";
import { incomingEdges, type FlatGraph, type FlatNode } from "./flat-graph.ts";
import type { HttpRequest } from "./http-request.ts";
import { renderTemplate, sourceAlias, type RenderedSql } from "./render-template.ts";

const NODE_ENTRY = "flow.node";
const NODE_OUTPUT = "flow.output";

/** Where a task input comes from, before it is resolved to a result id on an executor. */
export type TaskInput =
  | { readonly kind: "node"; readonly node: string; readonly port: string }
  | { readonly kind: "source"; readonly sourceId: string }
  | { readonly kind: "request"; readonly sourceId: string; readonly request: HttpRequest };

/** Table alias inside the task → where its data comes from. */
export type TaskInputs = Readonly<Record<string, TaskInput>>;

/**
 * A task with its code fully resolved. A `view` only displays its inputs and runs nothing; a
 * `relay` passes each input on as the output of the same port (the node entry, ADR 0016).
 */
export type CompiledTask =
  | { readonly kind: "sql"; readonly query: string; readonly inputs: TaskInputs }
  | {
      readonly kind: "python";
      readonly code: string;
      readonly entry: string;
      readonly params: Readonly<Record<string, unknown>>;
      readonly inputs: TaskInputs;
    }
  | { readonly kind: "view"; readonly inputs: TaskInputs }
  | { readonly kind: "relay"; readonly inputs: TaskInputs };

type ImplKind = NodeImpl["kind"];
type ImplOf<K extends ImplKind> = Extract<NodeImpl, { kind: K }>;

type Compiler = {
  readonly runtime: Runtime;
  readonly compile: (node: FlatNode, graph: FlatGraph) => Result<CompiledTask, NodeError>;
};

const COMPILERS: Record<ImplKind, Compiler> = {
  sql: { runtime: "sql", compile: compileSql },
  python: { runtime: "python", compile: compilePython },
  view: {
    runtime: "sql",
    compile: (node, graph) => ok({ kind: "view", inputs: portInputs(graph, node) }),
  },
  flow: { runtime: "sql", compile: rejectUnexpanded },
  builtin: { runtime: "sql", compile: compileBuiltin },
};

/** The runtime a node needs: declared in `requires`, or implied by its implementation. */
export const runtimeOf = (node: FlatNode): Runtime =>
  node.manifest.requires?.runtime ?? COMPILERS[node.manifest.impl.kind].runtime;

export const compileTask = (node: FlatNode, graph: FlatGraph): Result<CompiledTask, NodeError> =>
  COMPILERS[node.manifest.impl.kind].compile(node, graph);

function compileSql(node: FlatNode, graph: FlatGraph): Result<CompiledTask, NodeError> {
  const inputs = portInputs(graph, node);
  const rendered = renderTemplate(implOf(node, "sql").template, {
    params: node.params,
    tables: Object.fromEntries(Object.keys(inputs).map((alias) => [alias, alias])),
  });
  if (!rendered.ok) return rendered;
  return ok({
    kind: "sql",
    query: rendered.value.sql,
    inputs: { ...inputs, ...renderedInputs(rendered.value) },
  });
}

function compilePython(node: FlatNode, graph: FlatGraph): Result<CompiledTask, NodeError> {
  const { code, entry } = implOf(node, "python");
  return ok({ kind: "python", code, entry, params: node.params, inputs: portInputs(graph, node) });
}

/**
 * Boundaries survive expansion only in the flow being edited: the node entry passes its test data
 * on, and a node output, like a view, only needs its input.
 */
function compileBuiltin(node: FlatNode, graph: FlatGraph): Result<CompiledTask, NodeError> {
  const { name } = implOf(node, "builtin");
  if (name === NODE_ENTRY) return ok({ kind: "relay", inputs: portInputs(graph, node) });
  if (name === NODE_OUTPUT) return ok({ kind: "view", inputs: portInputs(graph, node) });
  return rejectUnexpanded(node);
}

function rejectUnexpanded(node: FlatNode): never {
  throw new Error(`Node ${node.id} should have been expanded before planning`);
}

/** Each input port is visible to the task under its own id. */
const portInputs = (graph: FlatGraph, node: FlatNode): TaskInputs =>
  Object.fromEntries(
    incomingEdges(graph, node.id).map((edge) => [
      edge.to.port,
      { kind: "node", node: edge.from.node, port: edge.from.port } as const,
    ]),
  );

/** The sources and API requests a rendered template reads, each under its table alias. */
export const renderedInputs = ({ sources, requests }: RenderedSql): TaskInputs => ({
  ...Object.fromEntries(
    sources.map((sourceId) => [sourceAlias(sourceId), { kind: "source", sourceId } as const]),
  ),
  ...Object.fromEntries(
    Object.entries(requests).map(([sourceId, request]) => [
      sourceAlias(sourceId),
      { kind: "request", sourceId, request } as const,
    ]),
  ),
});

function implOf<K extends ImplKind>(node: FlatNode, kind: K): ImplOf<K> {
  const { impl } = node.manifest;
  if (isImplOf(impl, kind)) return impl;
  throw new Error(`Node ${node.id} was dispatched to the ${kind} compiler`);
}

const isImplOf = <K extends ImplKind>(impl: NodeImpl, kind: K): impl is ImplOf<K> =>
  impl.kind === kind;
