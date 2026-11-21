import { FLOW_FORMAT, type Flow, type NodeManifest } from "@nodomics/protocol";
import { MOCK_NODES } from "./node-catalog.ts";
import type { Table } from "./table.ts";

export type FlowRevision = { readonly rev: number; readonly flow: Flow };

export type RunControl = { readonly cancel: () => void };

/** Everything one connection to the mock engine remembers. */
export type Session = {
  readonly catalog: Map<string, NodeManifest>;
  readonly results: Map<string, Table>;
  readonly runs: Map<string, RunControl>;
  readonly currentFlow: () => FlowRevision;
  readonly setFlow: (revision: FlowRevision) => void;
  readonly nextRunId: () => string;
};

const EMPTY_FLOW: FlowRevision = { rev: 0, flow: { format: FLOW_FORMAT, nodes: [], edges: [] } };

export function createSession(): Session {
  const flow = { current: EMPTY_FLOW };
  const runCounter = { value: 0 };
  return {
    catalog: new Map(MOCK_NODES.map((manifest) => [manifest.id, manifest])),
    results: new Map(),
    runs: new Map(),
    currentFlow: () => flow.current,
    setFlow: (revision) => {
      flow.current = revision;
    },
    nextRunId: () => `run_${String(++runCounter.value)}`,
  };
}
