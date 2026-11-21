import { Type, type Static } from "@sinclair/typebox";
import { FlowGraph } from "./graph.ts";
import { DataType, Id, Runtime, SemVer } from "./primitives.ts";

export const PortSpec = Type.Object({
  id: Id,
  name: Type.Optional(Type.String()),
  type: DataType,
  optional: Type.Optional(Type.Boolean()),
  multi: Type.Optional(Type.Boolean()),
});
export type PortSpec = Static<typeof PortSpec>;

/** A JSON Schema object; widgets beyond plain types are declared with the `x-nodomics` keyword. */
export const ParamsSchema = Type.Object(
  {
    type: Type.Literal("object"),
    properties: Type.Record(Type.String(), Type.Unknown()),
    required: Type.Optional(Type.Array(Type.String())),
  },
  { additionalProperties: true },
);

export const SqlImpl = Type.Object({ kind: Type.Literal("sql"), template: Type.String() });
export const PythonImpl = Type.Object({
  kind: Type.Literal("python"),
  code: Type.String(),
  entry: Type.String(),
});
export const ViewImpl = Type.Object({ kind: Type.Literal("view"), spec: Type.Unknown() });
export const FlowImpl = Type.Object({ kind: Type.Literal("flow"), graph: FlowGraph });
export const BuiltinImpl = Type.Object({
  kind: Type.Literal("builtin"),
  name: Type.Union([
    Type.Literal("flow.input"),
    Type.Literal("flow.output"),
    Type.Literal("flow.node"),
  ]),
});

export const NodeImpl = Type.Union([SqlImpl, PythonImpl, ViewImpl, FlowImpl, BuiltinImpl]);
export type NodeImpl = Static<typeof NodeImpl>;

export const Requirements = Type.Object({
  runtime: Type.Optional(Runtime),
  packages: Type.Optional(Type.Array(Type.String())),
  network: Type.Optional(Type.Boolean()),
});

export const NodeManifest = Type.Object({
  id: Id,
  version: SemVer,
  name: Type.String({ minLength: 1 }),
  description: Type.Optional(Type.String()),
  category: Type.String({ minLength: 1 }),
  icon: Type.Optional(Type.String()),
  inputs: Type.Array(PortSpec),
  outputs: Type.Array(PortSpec),
  params: ParamsSchema,
  impl: NodeImpl,
  requires: Type.Optional(Requirements),
});
export type NodeManifest = Static<typeof NodeManifest>;
