import { JsonRpcErrorCode, RpcError } from "./errors.ts";
import {
  classifyMessage,
  type ErrorObject,
  type NotificationMessage,
  type RequestId,
  type RequestMessage,
  type ResponseMessage,
} from "./messages.ts";
import type { Transport } from "./transport.ts";

export type RequestHandler = (params: unknown) => unknown;
export type NotificationHandler = (params: unknown) => void;

export interface RpcPeer {
  request(method: string, params: unknown): Promise<unknown>;
  notify(method: string, params: unknown): void;
  handle(method: string, handler: RequestHandler): void;
  on(method: string, handler: NotificationHandler): () => void;
  close(): void;
}

type Pending = {
  readonly resolve: (value: unknown) => void;
  readonly reject: (error: RpcError) => void;
};

type PeerState = {
  readonly transport: Transport;
  readonly pending: Map<RequestId, Pending>;
  readonly handlers: Map<string, RequestHandler>;
  readonly subscribers: Map<string, Set<NotificationHandler>>;
  readonly nextId: () => number;
  readonly isClosed: () => boolean;
};

export function createPeer(transport: Transport): RpcPeer {
  const closed = { value: false };
  const state = createState(transport, () => closed.value);
  const stopListening = transport.onMessage((value) => {
    dispatchIncoming(state, value);
  });
  return {
    request: (method, params) => sendRequest(state, method, params),
    notify: (method, params) => {
      transport.send({ jsonrpc: "2.0", method, params });
    },
    handle: (method, handler) => state.handlers.set(method, handler),
    on: (method, handler) => subscribe(state, method, handler),
    close: () => {
      closed.value = true;
      stopListening();
      rejectAllPending(state);
      transport.close();
    },
  };
}

function createState(transport: Transport, isClosed: () => boolean): PeerState {
  const counter = { value: 0 };
  return {
    transport,
    pending: new Map(),
    handlers: new Map(),
    subscribers: new Map(),
    nextId: () => ++counter.value,
    isClosed,
  };
}

function sendRequest(state: PeerState, method: string, params: unknown): Promise<unknown> {
  if (state.isClosed()) return Promise.reject(connectionClosed());
  const id = state.nextId();
  return new Promise((resolve, reject) => {
    state.pending.set(id, { resolve, reject });
    state.transport.send({ jsonrpc: "2.0", id, method, params });
  });
}

function subscribe(state: PeerState, method: string, handler: NotificationHandler): () => void {
  const handlers = state.subscribers.get(method) ?? new Set<NotificationHandler>();
  state.subscribers.set(method, handlers.add(handler));
  return () => handlers.delete(handler);
}

function dispatchIncoming(state: PeerState, value: unknown): void {
  const incoming = classifyMessage(value);
  switch (incoming.kind) {
    case "request":
      void answerRequest(state, incoming.message);
      return;
    case "notification":
      deliverNotification(state, incoming.message);
      return;
    case "response":
      settlePending(state, incoming.message);
      return;
    case "invalid":
      replyInvalid(state, incoming.id);
      return;
  }
}

async function answerRequest(state: PeerState, request: RequestMessage): Promise<void> {
  const handler = state.handlers.get(request.method);
  if (handler === undefined) {
    sendError(state, request.id, {
      code: JsonRpcErrorCode.METHOD_NOT_FOUND,
      message: `Method not found: ${request.method}`,
    });
    return;
  }
  try {
    state.transport.send({ jsonrpc: "2.0", id: request.id, result: await handler(request.params) });
  } catch (error) {
    sendError(state, request.id, toErrorObject(error));
  }
}

function deliverNotification(state: PeerState, notification: NotificationMessage): void {
  state.subscribers.get(notification.method)?.forEach((handler) => {
    handler(notification.params);
  });
}

function settlePending(state: PeerState, response: ResponseMessage): void {
  const pending = state.pending.get(response.id);
  state.pending.delete(response.id);
  if ("error" in response) {
    pending?.reject(new RpcError(response.error.code, response.error.message, response.error.data));
  } else {
    pending?.resolve(response.result);
  }
}

function replyInvalid(state: PeerState, id: RequestId | undefined): void {
  if (id !== undefined)
    sendError(state, id, { code: JsonRpcErrorCode.INVALID_REQUEST, message: "Invalid request" });
}

function rejectAllPending(state: PeerState): void {
  state.pending.forEach((pending) => {
    pending.reject(connectionClosed());
  });
  state.pending.clear();
}

function sendError(state: PeerState, id: RequestId, error: ErrorObject): void {
  state.transport.send({ jsonrpc: "2.0", id, error });
}

const toErrorObject = (error: unknown): ErrorObject =>
  error instanceof RpcError
    ? { code: error.code, message: error.message, data: error.data }
    : { code: JsonRpcErrorCode.INTERNAL_ERROR, message: String(error) };

const connectionClosed = () =>
  new RpcError(JsonRpcErrorCode.CONNECTION_CLOSED, "The connection is closed");
