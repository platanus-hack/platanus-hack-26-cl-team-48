import {
  NepRequests,
  parse,
  type NepMethod,
  type NepParams,
  type NepResult,
} from "@nodomics/protocol";
import {
  createMemoryTransportPair,
  createPeer,
  JsonRpcErrorCode,
  RpcError,
  type RpcPeer,
  type Transport,
} from "@nodomics/rpc";
import { createCatalogHandlers } from "./catalog-handlers.ts";
import { createDataHandlers } from "./data-handlers.ts";
import { createFlowHandlers } from "./flow-handlers.ts";
import type { HandlerDeps, NepHandlers, Schedule } from "./nep-handlers.ts";
import { createSession } from "./session.ts";

export type MockEngineOptions = {
  /** Runs each step of a flow run; tests inject one to control timing. Defaults to microtasks. */
  readonly schedule?: Schedule;
};

/** Answers every NEP request on `peer` from an in-memory, deterministic engine. */
export function serveMockEngine(peer: RpcPeer, options: MockEngineOptions = {}): void {
  const handlers = createNepHandlers({
    session: createSession(),
    emit: (event, payload) => {
      peer.notify(event, payload);
    },
    schedule: options.schedule ?? queueMicrotask,
  });
  // Object.keys widens to string[]; the keys of NepRequests are exactly the NEP methods.
  (Object.keys(NepRequests) as NepMethod[]).forEach((method) => {
    peer.handle(method, (params) => answer(handlers, method, params));
  });
}

/** Starts a mock engine behind an in-memory transport and returns the interface's end. */
export function startMockEngine(options?: MockEngineOptions): Transport {
  const [engineEnd, clientEnd] = createMemoryTransportPair();
  serveMockEngine(createPeer(engineEnd), options);
  return clientEnd;
}

const createNepHandlers = (deps: HandlerDeps): NepHandlers => ({
  ...createCatalogHandlers(deps.session),
  ...createFlowHandlers(deps),
  ...createDataHandlers(deps.session),
});

function answer<M extends NepMethod>(
  handlers: NepHandlers,
  method: M,
  params: unknown,
): NepResult<M> {
  return handlers[method](parseParams(method, params));
}

function parseParams<M extends NepMethod>(method: M, params: unknown): NepParams<M> {
  const parsed = parse(NepRequests[method].params, params);
  if (!parsed.ok)
    throw new RpcError(
      JsonRpcErrorCode.INVALID_PARAMS,
      `Invalid params for ${method}`,
      parsed.error,
    );
  return parsed.value;
}
