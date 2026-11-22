import { Type } from "@sinclair/typebox";

const RefProperties = {
  draftId: Type.Optional(Type.String()),
  flowId: Type.Optional(Type.String()),
};
export const FlowRefSchema = Type.Object(RefProperties);
export const DraftRefSchema = Type.Object({ draftId: Type.String() });
export const CodeProperties = {
  nodeId: Type.String(),
  language: Type.Union([Type.Literal("python"), Type.Literal("sql")]),
  code: Type.String(),
  inputs: Type.Array(Type.String()),
  outputs: Type.Array(Type.String()),
};
export const OperationSchemas = {
  add_node: Type.Object({ type: Type.String(), nodeId: Type.String() }),
  remove_node: Type.Object({ nodeId: Type.String() }),
  connect: Type.Object({ from: Type.String(), to: Type.String() }),
  disconnect: Type.Object({ from: Type.String(), to: Type.String() }),
  set_param: Type.Object({ nodeId: Type.String(), name: Type.String(), value: Type.Unknown() }),
  create_code_node: Type.Object(CodeProperties),
  update_code_node: Type.Object(CodeProperties),
};
export const OperationSchema = Type.Union([
  Type.Object({ op: Type.Literal("add_node"), args: OperationSchemas.add_node }),
  Type.Object({ op: Type.Literal("remove_node"), args: OperationSchemas.remove_node }),
  Type.Object({ op: Type.Literal("connect"), args: OperationSchemas.connect }),
  Type.Object({ op: Type.Literal("disconnect"), args: OperationSchemas.disconnect }),
  Type.Object({ op: Type.Literal("set_param"), args: OperationSchemas.set_param }),
  Type.Object({ op: Type.Literal("create_code_node"), args: OperationSchemas.create_code_node }),
  Type.Object({ op: Type.Literal("update_code_node"), args: OperationSchemas.update_code_node }),
]);
export const SampleSchema = Type.Object({
  ...RefProperties,
  nodeId: Type.String(),
  port: Type.String(),
  page: Type.Optional(Type.Integer({ minimum: 0 })),
});
export const RunSchema = Type.Object({
  ...RefProperties,
  upTo: Type.Optional(Type.Array(Type.String())),
});
export const LogsSchema = Type.Object({ ...RefProperties, nodeId: Type.String() });
