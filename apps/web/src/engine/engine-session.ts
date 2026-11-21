import { createEngineClient, type EngineClient, type Transport } from "@nodomics/client";
import type { Flow, NepParams, NepResult, NodeManifest } from "@nodomics/protocol";
import type { ConnectionFailure, EngineEvent } from "./engine-events.ts";

const CLIENT_NAME = "nodomics-web";

export type PageRequest = Omit<NepParams<"data.page">, "ref">;
export type PortRequest = { readonly rev: number; readonly nodeId: string; readonly port: string };
export type Upload = { readonly name: string; readonly file: Uint8Array };

/** The interface's side of one connection to an engine. Every NEP request goes through here. */
export interface EngineSession {
  start(): Promise<void>;
  submitFlow(rev: number, flow: Flow): Promise<void>;
  run(rev: number, targets?: string[]): Promise<void>;
  inferSchema(request: PortRequest): Promise<void>;
  page(ref: string, request: PageRequest): Promise<NepResult<"data.page">>;
  profile(ref: string): Promise<NepResult<"data.profile">>;
  view(nodeId: string): Promise<NepResult<"data.view">>;
  display(ref: string): Promise<NepResult<"data.display">>;
  complete(request: NepParams<"code.complete">): Promise<NepResult<"code.complete">>;
  addSource(upload: Upload): Promise<NepResult<"source.add">>;
  registerNodes(nodes: ReadonlyArray<NodeManifest>): Promise<void>;
  close(): void;
}

export type EngineSessionDeps = {
  readonly engineId: string;
  readonly transport: Transport;
  readonly dispatch: (event: EngineEvent) => void;
};

const CONNECT_FAILURES = {
  PROTOCOL_MISMATCH: "protocol-mismatch",
  UNAUTHORIZED: "unauthorized",
} as const satisfies Record<string, ConnectionFailure>;

export function createEngineSession({
  engineId,
  transport,
  dispatch,
}: EngineSessionDeps): EngineSession {
  const client = createEngineClient(transport);
  const unsubscribes = forwardEngineEvents(client, dispatch);
  const registerNodes = async (nodes: ReadonlyArray<NodeManifest>) => {
    if (nodes.length > 0) await client.request("nodes.register", { nodes: [...nodes] });
  };
  return {
    start: async () => {
      dispatch({ type: "session.connecting", engineId });
      if (await connect(client, dispatch)) await loadCatalog(client, dispatch);
    },
    submitFlow: async (rev, flow) => {
      dispatch({ type: "flow.submitted", rev });
      await registerNodes(flow.customNodes ?? []);
      dispatch({ type: "flow.accepted", ...(await client.request("flow.set", { rev, flow })) });
    },
    run: async (rev, targets) => {
      dispatch({ type: "run.requested", rev });
      try {
        dispatch({
          type: "run.started",
          rev,
          ...(await client.request("flow.run", {
            rev,
            ...(targets === undefined ? {} : { targets }),
          })),
        });
      } catch (error) {
        dispatch({ type: "run.rejected", rev });
        throw error;
      }
    },
    inferSchema: async ({ rev, nodeId, port }) => {
      const inferred = await client.request("schema.infer", { nodeId, port });
      if (inferred.ok)
        dispatch({ type: "schema.inferred", rev, nodeId, port, columns: inferred.columns });
    },
    page: (ref, request) => client.request("data.page", { ref, ...request }),
    profile: (ref) => client.request("data.profile", { ref }),
    view: (nodeId) => client.request("data.view", { nodeId }),
    display: (ref) => client.request("data.display", { ref }),
    complete: (request) => client.request("code.complete", request),
    addSource: ({ name, file }) => client.request("source.add", { kind: "upload", name, file }),
    registerNodes,
    close: () => {
      unsubscribes.forEach((unsubscribe) => {
        unsubscribe();
      });
      client.close();
    },
  };
}

function forwardEngineEvents(
  client: EngineClient,
  dispatch: (event: EngineEvent) => void,
): ReadonlyArray<() => void> {
  return [
    client.on("node.status", (payload) => {
      dispatch({ type: "node.status", payload });
    }),
    client.on("node.result", (payload) => {
      dispatch({ type: "node.result", payload });
    }),
    client.on("node.display", (payload) => {
      dispatch({ type: "node.display", payload });
    }),
    client.on("run.finished", (payload) => {
      dispatch({ type: "run.finished", payload });
    }),
  ];
}

async function connect(
  client: EngineClient,
  dispatch: (event: EngineEvent) => void,
): Promise<boolean> {
  const connected = await client.connect({ client: CLIENT_NAME }).catch(() => undefined);
  if (connected?.ok === true)
    dispatch({ type: "session.connected", capabilities: connected.value });
  else
    dispatch({
      type: "session.failed",
      reason: connected === undefined ? "unreachable" : CONNECT_FAILURES[connected.error.code],
    });
  return connected?.ok === true;
}

async function loadCatalog(client: EngineClient, dispatch: (event: EngineEvent) => void) {
  const { nodes } = await client.request("nodes.list", {});
  dispatch({ type: "catalog.loaded", nodes });
}
