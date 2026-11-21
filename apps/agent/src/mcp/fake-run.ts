import { splitPortRef, type Catalog, type FakeFlow } from "./fake-flow.ts";
import { portsOf } from "./fake-flow.ts";
import type { FakeState } from "./fake-tool.ts";

export const SAMPLE_PAGE_SIZE = 20;
const SAMPLE_TOTAL_ROWS = 45;
const SAMPLE_COLUMNS = [
  { name: "row", type: "integer" },
  { name: "value", type: "number" },
] as const;

export type FlowIssue = { readonly nodeId: string; readonly message: string };
export type NodeRun = {
  readonly nodeId: string;
  readonly status: "ok" | "error" | "skipped";
  readonly error: string | null;
};

export type FlowRef = {
  readonly draftId?: string | undefined;
  readonly flowId?: string | undefined;
};

export function resolveFlow(state: FakeState, ref: FlowRef): FakeState["flows"][string] | string {
  if (ref.draftId !== undefined) {
    return state.drafts[ref.draftId]?.flow ?? `Draft "${ref.draftId}" does not exist`;
  }
  if (ref.flowId !== undefined)
    return state.flows[ref.flowId] ?? `Flow "${ref.flowId}" does not exist`;
  return "Provide draftId or flowId";
}

function nodeIssues(flow: FakeFlow, catalog: Catalog, nodeId: string): FlowIssue[] {
  const ports = portsOf(flow, catalog, nodeId);
  if (!ports) return [{ nodeId, message: `Unknown node type for "${nodeId}"` }];
  const connected = new Set(
    flow.edges
      .map((e) => splitPortRef(e.to))
      .filter(([id]) => id === nodeId)
      .map(([, port]) => port),
  );
  return ports.inputs
    .filter((port) => !connected.has(port))
    .map((port) => ({ nodeId, message: `Input "${port}" of "${nodeId}" is not connected` }));
}

export const validateFlow = (flow: FakeFlow, catalog: Catalog): readonly FlowIssue[] =>
  Object.keys(flow.nodes).flatMap((nodeId) => nodeIssues(flow, catalog, nodeId));

function ancestorsOf(flow: FakeFlow, targets: readonly string[]): ReadonlySet<string> {
  const wanted = new Set(targets);
  const grow = (): boolean =>
    flow.edges.some((e) => {
      const [from, to] = [splitPortRef(e.from)[0], splitPortRef(e.to)[0]];
      if (!wanted.has(to) || wanted.has(from)) return false;
      wanted.add(from);
      return true;
    });
  while (grow()) continue;
  return wanted;
}

export function executeFlow(
  flow: FakeFlow,
  catalog: Catalog,
  upTo: readonly string[] | undefined,
): readonly NodeRun[] {
  const selected = upTo ? ancestorsOf(flow, upTo) : null;
  const issues = validateFlow(flow, catalog);
  return Object.keys(flow.nodes).map((nodeId) => {
    if (selected && !selected.has(nodeId)) return { nodeId, status: "skipped", error: null };
    const issue = issues.find((i) => i.nodeId === nodeId);
    return issue
      ? { nodeId, status: "error", error: issue.message }
      : { nodeId, status: "ok", error: null };
  });
}

export function samplePage(page: number): Readonly<Record<string, unknown>> {
  const first = page * SAMPLE_PAGE_SIZE;
  const count = Math.max(0, Math.min(SAMPLE_PAGE_SIZE, SAMPLE_TOTAL_ROWS - first));
  const rows = Array.from({ length: count }, (_, i) => ({
    row: first + i,
    value: (first + i) * 1.5,
  }));
  return {
    schema: { columns: SAMPLE_COLUMNS },
    rows,
    page,
    hasMore: first + count < SAMPLE_TOTAL_ROWS,
  };
}
