export type RequestId = number | string;

export type ErrorObject = {
  readonly code: number;
  readonly message: string;
  readonly data?: unknown;
};

export type RequestMessage = {
  readonly jsonrpc: "2.0";
  readonly id: RequestId;
  readonly method: string;
  readonly params?: unknown;
};
export type NotificationMessage = {
  readonly jsonrpc: "2.0";
  readonly method: string;
  readonly params?: unknown;
};
export type ResponseMessage =
  | { readonly jsonrpc: "2.0"; readonly id: RequestId; readonly result: unknown }
  | { readonly jsonrpc: "2.0"; readonly id: RequestId; readonly error: ErrorObject };

export type JsonRpcMessage = RequestMessage | NotificationMessage | ResponseMessage;

export type IncomingMessage =
  | { readonly kind: "request"; readonly message: RequestMessage }
  | { readonly kind: "notification"; readonly message: NotificationMessage }
  | { readonly kind: "response"; readonly message: ResponseMessage }
  | { readonly kind: "invalid"; readonly id: RequestId | undefined };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isRequestId = (value: unknown): value is RequestId =>
  typeof value === "number" || typeof value === "string";

const isErrorObject = (value: unknown): value is ErrorObject =>
  isRecord(value) && typeof value["code"] === "number" && typeof value["message"] === "string";

/** Parses an untrusted incoming value into one of the JSON-RPC message kinds. */
export function classifyMessage(value: unknown): IncomingMessage {
  if (!isRecord(value) || value["jsonrpc"] !== "2.0") return { kind: "invalid", id: undefined };
  const id = isRequestId(value["id"]) ? value["id"] : undefined;
  if (typeof value["method"] === "string") return classifyCall(value, id);
  if (id !== undefined && ("result" in value || isErrorObject(value["error"])))
    return { kind: "response", message: value as ResponseMessage };
  return { kind: "invalid", id };
}

const classifyCall = (
  value: Record<string, unknown>,
  id: RequestId | undefined,
): IncomingMessage =>
  id === undefined
    ? { kind: "notification", message: value as NotificationMessage }
    : { kind: "request", message: value as RequestMessage };
