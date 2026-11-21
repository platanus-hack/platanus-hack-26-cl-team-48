import { withSecrets } from "./with-secrets.ts";
import type { AppStores } from "../app-stores.ts";
import type { EngineConnection } from "./engine-connection.ts";
import type { EngineEntry } from "./engine-entry.ts";
import { createEngineSession, type EngineSession } from "./engine-session.ts";
import { createFlowSync, type FlowSync, type Timers } from "./flow-sync.ts";

const FLOW_SYNC_DELAY_MS = 300;

export type OpenConnectionDeps = {
  readonly entry: EngineEntry;
  readonly stores: Pick<AppStores, "flowStore" | "engineStore" | "secretStore">;
  readonly timers: Timers;
  readonly onError: (error: unknown) => void;
};

export type OpenedConnection = {
  /** The connection once the engine accepted it and has the current flow; `undefined` if refused. */
  readonly ready: Promise<EngineConnection | undefined>;
  readonly close: () => void;
};

/** Connects to an engine, sends it the flow being edited and keeps it in sync until closed. */
export function openConnection(deps: OpenConnectionDeps): OpenedConnection {
  const session = createEngineSession({
    engineId: deps.entry.id,
    transport: deps.entry.connect(),
    dispatch: deps.stores.engineStore.getState().dispatch,
  });
  const sync = createSecretFlowSync(deps, session);
  const lifecycle: Lifecycle = { isClosed: false, unsubscribe: noop };
  return {
    ready: connectAndSync({ deps, session, sync, lifecycle }),
    close: () => {
      closeConnection({ lifecycle, sync, session });
    },
  };
}

type ConnectionParts = {
  readonly deps: OpenConnectionDeps;
  readonly session: EngineSession;
  readonly sync: FlowSync;
  readonly lifecycle: Lifecycle;
};

function closeConnection({ lifecycle, sync, session }: Omit<ConnectionParts, "deps">) {
  lifecycle.isClosed = true;
  lifecycle.unsubscribe();
  sync.cancel();
  session.close();
}

async function connectAndSync(parts: ConnectionParts): Promise<EngineConnection | undefined> {
  const { deps, session, sync, lifecycle } = parts;
  await session.start();
  if (isClosed(lifecycle) || !isConnected(deps)) return undefined;
  await deps.stores.secretStore.getState().refresh();
  if (isClosed(lifecycle) || !isConnected(deps)) return undefined;
  const { rev, flow } = deps.stores.flowStore.getState().state;
  lifecycle.unsubscribe = subscribeFlow(deps.stores, sync);
  sync.schedule(rev, flow);
  await sync.flush();
  if (isClosed(lifecycle)) return undefined;
  return { session, flushFlow: sync.flush };
}

type Lifecycle = { isClosed: boolean; unsubscribe: () => void };

const noop = () => undefined;

// A function call, so the compiler does not assume the flag cannot change across an await.
const isClosed = (lifecycle: Lifecycle) => lifecycle.isClosed;

const isConnected = ({ stores }: OpenConnectionDeps) =>
  stores.engineStore.getState().state.connection.status === "connected";

function subscribeFlow(stores: OpenConnectionDeps["stores"], sync: FlowSync): () => void {
  const unsubscribeFlow = stores.flowStore.subscribe(({ state }, previous) => {
    if (state.rev !== previous.state.rev) sync.schedule(state.rev, state.flow);
  });
  const unsubscribeSecrets = stores.secretStore.subscribe(({ secrets }, previous) => {
    if (secrets === previous.secrets) return;
    const { rev, flow } = stores.flowStore.getState().state;
    sync.schedule(rev, flow);
  });
  return () => {
    unsubscribeFlow();
    unsubscribeSecrets();
  };
}

function createSecretFlowSync(deps: OpenConnectionDeps, session: EngineSession): FlowSync {
  return createFlowSync({
    delayMs: FLOW_SYNC_DELAY_MS,
    timers: deps.timers,
    submit: (rev, flow) =>
      session.submitFlow(
        rev,
        withSecrets(
          flow,
          deps.stores.engineStore.getState().state.catalog,
          deps.stores.secretStore.getState().secrets,
        ),
      ),
    onError: deps.onError,
  });
}
