import { DataType } from "@nodomics/protocol";
import { Type, type Static } from "@sinclair/typebox";

const ComponentPort = Type.Object({
  name: Type.String(),
  type: DataType,
  unit: Type.String(),
});

export const ComponentCard = Type.Object({
  id: Type.String(),
  kind: Type.Union([Type.Literal("node"), Type.Literal("flow")]),
  name: Type.String(),
  summary: Type.String(),
  inputs: Type.Array(ComponentPort),
  outputs: Type.Array(ComponentPort),
  params: Type.Array(
    Type.Object({
      id: Type.String(),
      title: Type.String(),
      value: Type.Unknown(),
      unit: Type.String(),
    }),
  ),
  process: Type.String(),
  connections: Type.Array(Type.Object({ from: Type.String(), to: Type.String() })),
  assumptions: Type.Array(Type.String()),
  context: Type.Object({ domain: Type.String(), crop: Type.String(), region: Type.String() }),
  lineage: Type.Object({
    parent: Type.String(),
    author: Type.String(),
    adapted_by: Type.String(),
  }),
  history: Type.Array(Type.Object({ at: Type.String(), by: Type.String(), change: Type.String() })),
});
export type ComponentCard = Static<typeof ComponentCard>;
