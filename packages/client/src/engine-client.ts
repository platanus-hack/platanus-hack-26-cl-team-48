import {
  NepNotifications,
  NepRequests,
  parse,
  type Capabilities,
  type NepEvent,
  type NepEventPayload,
  type NepMethod,
  type NepParams,
  type NepResult,
  type Result,
  type ValidationIssue,
} from "@nodomics/protocol";
import { createPeer, type RpcPeer, type Transport } from "@nodomics/rpc";
import { EngineClientError } from "./engine-client-error.ts";
import { connect, type ClientIdentity, type ConnectError } from "./connect.ts";

type InvalidEventHandler = (event: NepEvent, issues: readonly ValidationIssue[]) => void;

export type EngineClientOptions = { readonly onInvalidEvent?: InvalidEventHandler };

export interface EngineClient {
  connect(identity: ClientIdentity): Promise<Result<Capabilities, ConnectError>>;
  request<M extends NepMethod>(method: M, params: NepParams<M>): Promise<NepResult<M>>;
  on<E extends NepEvent>(event: E, handler: (payload: NepEventPayload<E>) => void): () => void;
  close(): void;
}

type ClientContext = {
  readonly peer: RpcPeer;
  readonly onInvalidEvent: InvalidEventHandler;
};

export function createEngineClient(
  transport: Transport,
  options: EngineClientOptions = {},
): EngineClient {
  const context = { peer: createPeer(transport), onInvalidEvent: options.onInvalidEvent ?? ignore };
  const request = <M extends NepMethod>(method: M, params: NepParams<M>) =>
    requestParsed(context, method, params);
  return {
    connect: (identity) => connect((params) => request("engine.hello", params), identity),
    request,
    on: (event, handler) => subscribeParsed(context, event, handler),
    close: () => {
      context.peer.close();
    },
  };
}

async function requestParsed<M extends NepMethod>(
  context: ClientContext,
  method: M,
  params: NepParams<M>,
): Promise<NepResult<M>> {
  const result = parse(NepRequests[method].result, await context.peer.request(method, params));
  if (!result.ok)
    throw new EngineClientError("INVALID_RESPONSE", `Invalid response to ${method}`, result.error);
  return result.value;
}

function subscribeParsed<E extends NepEvent>(
  context: ClientContext,
  event: E,
  handler: (payload: NepEventPayload<E>) => void,
): () => void {
  return context.peer.on(event, (payload) => {
    const parsed = parse(NepNotifications[event], payload);
    if (parsed.ok) handler(parsed.value);
    else context.onInvalidEvent(event, parsed.error);
  });
}

const ignore = () => undefined;
