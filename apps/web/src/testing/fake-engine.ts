import { createMemoryTransportPair, type Transport } from "@nodomics/client";
import {
  NepRequests,
  parse,
  PROTOCOL_VERSION,
  type NepEvent,
  type NepEventPayload,
  type NepMethod,
  type NepParams,
  type NepResult,
} from "@nodomics/protocol";

const METHOD_NOT_FOUND = -32601;
const INVALID_PARAMS = -32602;

/** Thrown by a fake handler to answer with a JSON-RPC error. */
export class FakeRpcError extends Error {
  constructor(
    readonly code: number,
    message: string,
    readonly data?: unknown,
  ) {
    super(message);
  }
}

export type FakeHandlers = {
  readonly [M in NepMethod]?: (params: NepParams<M>) => NepResult<M> | Promise<NepResult<M>>;
};

export type FakeEngine = {
  /** The interface's end of the connection. */
  readonly transport: Transport;
  readonly calls: ReadonlyArray<{ readonly method: string; readonly params: unknown }>;
  readonly notify: <E extends NepEvent>(event: E, payload: NepEventPayload<E>) => void;
};

type Request = { readonly id: number | string; readonly method: string; readonly params: unknown };

const DEFAULT_HANDLERS: FakeHandlers = {
  "engine.hello": () => ({
    protocol: PROTOCOL_VERSION,
    engine: "mock",
    runtimes: ["sql"],
    sources: ["upload"],
  }),
  "nodes.list": () => ({ nodes: [] }),
  "flow.set": ({ rev }) => ({ rev, stale: [], errors: [] }),
};

/**
 * A minimal in-memory NEP engine for the interface's tests. dependency-cruiser keeps apps/web
 * away from @nodomics/engine-mock, so the tests speak JSON-RPC by hand over a memory transport.
 */
export function startFakeEngine(handlers: FakeHandlers = {}): FakeEngine {
  const [engineEnd, clientEnd] = createMemoryTransportPair();
  const calls: { method: string; params: unknown }[] = [];
  const allHandlers = { ...DEFAULT_HANDLERS, ...handlers };
  engineEnd.onMessage((message) => {
    if (!isRequest(message)) return;
    calls.push({ method: message.method, params: message.params });
    const respond = async () => {
      engineEnd.send({ jsonrpc: "2.0", id: message.id, ...(await answer(allHandlers, message)) });
    };
    void respond();
  });
  return {
    transport: clientEnd,
    calls,
    notify: (event, payload) => {
      engineEnd.send({ jsonrpc: "2.0", method: event, params: payload });
    },
  };
}

async function answer(handlers: FakeHandlers, request: Request) {
  if (!isNepMethod(request.method)) return failure(METHOD_NOT_FOUND, request.method);
  // Indexing the mapped table with a union loses the method/params link; params are parsed below.
  const handler = handlers[request.method] as ((params: unknown) => unknown) | undefined;
  const params = parse(NepRequests[request.method].params, request.params);
  if (handler === undefined) return failure(METHOD_NOT_FOUND, request.method);
  if (!params.ok) return failure(INVALID_PARAMS, request.method);
  try {
    return { result: await handler(params.value) };
  } catch (error) {
    if (error instanceof FakeRpcError)
      return { error: { code: error.code, message: error.message, data: error.data } };
    throw error;
  }
}

const failure = (code: number, message: string) => ({ error: { code, message } });

const isNepMethod = (method: string): method is NepMethod => method in NepRequests;

function isRequest(message: unknown): message is Request {
  return (
    typeof message === "object" &&
    message !== null &&
    "method" in message &&
    "id" in message &&
    typeof message.method === "string"
  );
}
