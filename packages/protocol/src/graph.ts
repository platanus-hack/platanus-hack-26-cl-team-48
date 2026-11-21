import { Type, type Static } from "@sinclair/typebox";
import { Id, SemVer } from "./primitives.ts";

export const Position = Type.Object({ x: Type.Number(), y: Type.Number() });

export const FlowNode = Type.Object({
  id: Id,
  type: Id,
  version: SemVer,
  params: Type.Record(Type.String(), Type.Unknown()),
  position: Position,
  label: Type.Optional(Type.String()),
});
export type FlowNode = Static<typeof FlowNode>;

export const PortRef = Type.Object({ node: Id, port: Id });
export type PortRef = Static<typeof PortRef>;

export const FlowEdge = Type.Object({ id: Id, from: PortRef, to: PortRef });
export type FlowEdge = Static<typeof FlowEdge>;

export const FlowGraph = Type.Object({ nodes: Type.Array(FlowNode), edges: Type.Array(FlowEdge) });
export type FlowGraph = Static<typeof FlowGraph>;
