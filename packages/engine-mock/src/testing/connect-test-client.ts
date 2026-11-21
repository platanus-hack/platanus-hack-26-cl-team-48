import {
  NepNotifications,
  NepRequests,
  parse,
  type NepEvent,
  type NepEventPayload,
  type NepMethod,
  type NepParams,
  type NepResult,
} from "@nodomics/protocol";
import { createPeer, type RpcPeer } from "@nodomics/rpc";
import { startMockEngine, type MockEngineOptions } from "../mock-engine.ts";

export type RecordedEvent = {
  [E in NepEvent]: { readonly event: E; readonly payload: NepEventPayload<E> };
}[NepEvent];

export type TestClient = {
  readonly peer: RpcPeer;
  readonly request: <M extends NepMethod>(method: M, params: NepParams<M>) => Promise<NepResult<M>>;
  readonly events: readonly RecordedEvent[];
  readonly invalidEvents: readonly unknown[];
  /** Resolves once every message the engine sent so far has been delivered. */
  readonly drain: () => Promise<void>;
};

/** A client peer on the other end of the mock engine that checks every message against the NEP. */
export function connectTestClient(options?: MockEngineOptions): TestClient {
  const peer = createPeer(startMockEngine(options));
  const events: RecordedEvent[] = [];
  const invalidEvents: unknown[] = [];
  // Object.keys widens to string[]; the keys of NepNotifications are exactly the NEP events.
  (Object.keys(NepNotifications) as NepEvent[]).forEach((event) => {
    peer.on(event, (payload) => {
      recordEvent({ event, payload, events, invalidEvents });
    });
  });
  const request = async <M extends NepMethod>(method: M, params: NepParams<M>) =>
    expectValidResult(method, await peer.request(method, params));
  return {
    peer,
    request,
    events,
    invalidEvents,
    drain: async () => {
      await peer.request("nodes.list", {});
    },
  };
}

function recordEvent(record: {
  readonly event: NepEvent;
  readonly payload: unknown;
  readonly events: RecordedEvent[];
  readonly invalidEvents: unknown[];
}): void {
  const parsed = parse(NepNotifications[record.event], record.payload);
  // TypeScript cannot correlate the event name with its parsed payload across the union.
  if (parsed.ok)
    record.events.push({ event: record.event, payload: parsed.value } as RecordedEvent);
  else record.invalidEvents.push({ event: record.event, issues: parsed.error });
}

function expectValidResult<M extends NepMethod>(method: M, value: unknown): NepResult<M> {
  const parsed = parse(NepRequests[method].result, value);
  if (!parsed.ok) throw new Error(`Invalid ${method} result: ${JSON.stringify(parsed.error)}`);
  return parsed.value;
}
