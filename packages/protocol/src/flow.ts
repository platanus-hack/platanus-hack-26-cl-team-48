import { Type, type Static } from "@sinclair/typebox";
import { FlowEdge, FlowNode } from "./graph.ts";
import { NodeManifest } from "./manifest.ts";

export const FLOW_FORMAT = "nodomics/flow@0";

/** The `.nodo.json` document: what is saved, shared and sent to the engine. */
export const Flow = Type.Object({
  format: Type.Literal(FLOW_FORMAT),
  name: Type.Optional(Type.String()),
  nodes: Type.Array(FlowNode),
  edges: Type.Array(FlowEdge),
  customNodes: Type.Optional(Type.Array(NodeManifest)),
});
export type Flow = Static<typeof Flow>;
