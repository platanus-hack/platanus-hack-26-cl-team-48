import { Type, type Static } from "@sinclair/typebox";

export const NodeErrorCode = Type.Union([
  Type.Literal("PARAM_REQUIRED"),
  Type.Literal("PARAM_INVALID"),
  Type.Literal("INPUT_MISSING"),
  Type.Literal("TYPE_MISMATCH"),
  Type.Literal("COLUMN_NOT_FOUND"),
  Type.Literal("UNKNOWN_NODE_TYPE"),
  Type.Literal("SQL_ERROR"),
  Type.Literal("PYTHON_EXCEPTION"),
  Type.Literal("RUNTIME_UNAVAILABLE"),
  Type.Literal("OUT_OF_MEMORY"),
  Type.Literal("SOURCE_UNREADABLE"),
  Type.Literal("SOURCE_UNAVAILABLE"),
  Type.Literal("CYCLE"),
  Type.Literal("CANCELLED"),
]);
export type NodeErrorCode = Static<typeof NodeErrorCode>;

/** `message` and `hint` are written for the end user; `detail` is technical and shown folded. */
export const NodeError = Type.Object({
  code: NodeErrorCode,
  message: Type.String(),
  hint: Type.Optional(Type.String()),
  detail: Type.Optional(Type.String()),
  param: Type.Optional(Type.String()),
});
export type NodeError = Static<typeof NodeError>;

/** Nodomics-specific JSON-RPC error codes. Standard codes live in `@nodomics/rpc`. */
export const NepErrorCode = {
  RESULT_EXPIRED: -32001,
  /** `error.data` carries the engine's protocol version as a string. */
  PROTOCOL_MISMATCH: -32002,
  UNAUTHORIZED: -32003,
  UNKNOWN_NODE: -32004,
} as const;
export type NepErrorCode = (typeof NepErrorCode)[keyof typeof NepErrorCode];
