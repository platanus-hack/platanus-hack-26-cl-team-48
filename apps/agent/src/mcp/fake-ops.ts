import { err, ok, parse } from "@nodomics/protocol";
import { Type, type Static, type TSchema } from "@sinclair/typebox";
import {
  addNode,
  connect,
  declareAsNode,
  disconnect,
  putCodeNode,
  removeNode,
  setParam,
  type Catalog,
  type CodeNode,
  type FakeFlow,
  type FlowResult,
} from "./fake-flow.ts";

export type DraftOp = {
  readonly name: string;
  readonly description: string;
  readonly schema: TSchema;
  readonly run: (flow: FakeFlow, catalog: Catalog, args: unknown) => FlowResult;
};

function defineOp<S extends TSchema>(spec: {
  readonly name: string;
  readonly description: string;
  readonly schema: S;
  readonly apply: (flow: FakeFlow, catalog: Catalog, args: Static<S>) => FlowResult;
}): DraftOp {
  const run = (flow: FakeFlow, catalog: Catalog, args: unknown): FlowResult => {
    const parsed = parse(spec.schema, args);
    return parsed.ok
      ? spec.apply(flow, catalog, parsed.value)
      : err(parsed.error.map(({ path, message }) => `${path || "args"}: ${message}`).join("; "));
  };
  return { name: spec.name, description: spec.description, schema: spec.schema, run };
}

const PortPair = Type.Object({ from: Type.String(), to: Type.String() });
const Ports = Type.Array(Type.String());
const CodeSpec = Type.Object({
  nodeId: Type.String(),
  language: Type.Union([Type.Literal("python"), Type.Literal("sql")]),
  code: Type.String(),
  inputs: Ports,
  outputs: Ports,
});

const toCodeNode = (spec: Static<typeof CodeSpec>): CodeNode => ({
  id: spec.nodeId,
  language: spec.language,
  code: spec.code,
  inputs: spec.inputs,
  outputs: spec.outputs,
});

export const DRAFT_OPS: readonly DraftOp[] = [
  defineOp({
    name: "add_node",
    description: "Add a node of a catalog type to the draft.",
    schema: Type.Object({ type: Type.String(), nodeId: Type.String() }),
    apply: (flow, catalog, args) => addNode(flow, catalog, args),
  }),
  defineOp({
    name: "remove_node",
    description: "Remove a node and its connections from the draft.",
    schema: Type.Object({ nodeId: Type.String() }),
    apply: (flow, _catalog, args) => removeNode(flow, args),
  }),
  defineOp({
    name: "connect",
    description: "Connect an output port to an input port, as node.port.",
    schema: PortPair,
    apply: (flow, catalog, args) => connect(flow, catalog, args),
  }),
  defineOp({
    name: "disconnect",
    description: "Remove a connection between two ports.",
    schema: PortPair,
    apply: (flow, _catalog, args) => disconnect(flow, args),
  }),
  defineOp({
    name: "set_param",
    description: "Set a node parameter; the value must satisfy its JSON Schema.",
    schema: Type.Object({ nodeId: Type.String(), name: Type.String(), value: Type.Unknown() }),
    apply: (flow, catalog, args) => setParam(flow, catalog, args),
  }),
  defineOp({
    name: "create_code_node",
    description: "Create a Python or SQL code node that travels inside the flow.",
    schema: CodeSpec,
    apply: (flow, _catalog, args) => putCodeNode(flow, "create", toCodeNode(args)),
  }),
  defineOp({
    name: "update_code_node",
    description: "Replace the code and ports of an existing code node.",
    schema: CodeSpec,
    apply: (flow, _catalog, args) => putCodeNode(flow, "update", toCodeNode(args)),
  }),
  defineOp({
    name: "declare_as_node",
    description: "Declare the flow as a reusable node with inputs and exposed parameters.",
    schema: Type.Object({ name: Type.String(), inputs: Ports, params: Ports }),
    apply: (flow, _catalog, args) => declareAsNode(flow, args),
  }),
];

export function runBatch(
  flow: FakeFlow,
  catalog: Catalog,
  ops: readonly { readonly op: string; readonly args: unknown }[],
): FlowResult {
  return ops.reduce<FlowResult>((current, { op, args }, index) => {
    if (!current.ok) return current;
    const found = DRAFT_OPS.find((candidate) => candidate.name === op);
    const next = found ? found.run(current.value, catalog, args) : err(`unknown operation "${op}"`);
    return next.ok ? next : err(`ops[${String(index)}]: ${next.error}`);
  }, ok(flow));
}
