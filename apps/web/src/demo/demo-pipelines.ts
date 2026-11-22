import type { PublicationDraft, PublicationKind } from "@nodomics/hub";
import type { FlowEdge, FlowNode, NodeManifest } from "@nodomics/protocol";
import { CORE_MANIFESTS } from "./demo-core-manifests.ts";

/**
 * Grows a seed publication into a credible pipeline: the spec adds steps around the seed's own nodes and
 * rewires every connection. Seed nodes not named in the new connections are dropped.
 */
export type PipelineSpec = {
  readonly kind: PublicationKind;
  readonly steps: ReadonlyArray<FlowNode>;
  /** `"a>b"` connects `a.out` to `b.in`; `"a>b:right"` targets another input port. */
  readonly edges: ReadonlyArray<string>;
};

const COLUMN_GAP = 260;
const ROW_GAP = 150;
const DEFAULT_INPUT = "in";
const OUTPUT_PORT = "out";

export const step = (
  { id, type, label }: { readonly id: string; readonly type: string; readonly label: string },
  params: Record<string, unknown> = {},
): FlowNode => ({ id, type, version: "0.1.0", params, position: { x: 0, y: 0 }, label });

function parseEdge(spec: string): FlowEdge {
  const [from = "", target = ""] = spec.split(">");
  const [to = "", port = DEFAULT_INPUT] = target.split(":");
  return {
    id: `${from}_${OUTPUT_PORT}__${to}_${port}`,
    from: { node: from, port: OUTPUT_PORT },
    to: { node: to, port },
  };
}

function depthsOf(
  nodeIds: ReadonlyArray<string>,
  edges: ReadonlyArray<FlowEdge>,
): Map<string, number> {
  const depth = new Map(nodeIds.map((id) => [id, 0]));
  for (let pass = 0; pass < nodeIds.length; pass += 1)
    for (const edge of edges)
      depth.set(
        edge.to.node,
        Math.max(depth.get(edge.to.node) ?? 0, (depth.get(edge.from.node) ?? 0) + 1),
      );
  return depth;
}

function laidOut(nodes: ReadonlyArray<FlowNode>, edges: ReadonlyArray<FlowEdge>): FlowNode[] {
  const depth = depthsOf(
    nodes.map((node) => node.id),
    edges,
  );
  const rows = new Map<number, number>();
  return nodes.map((node) => {
    const column = depth.get(node.id) ?? 0;
    const row = rows.get(column) ?? 0;
    rows.set(column, row + 1);
    return { ...node, position: { x: column * COLUMN_GAP, y: row * ROW_GAP } };
  });
}

/** The engine ships every `core.` node, so only the others need to travel with the flow. */
const CORE_PREFIX = "core.";

/**
 * The seed's own nodes travel in the flow, not only in the preview snapshot, so a copy opened in the
 * editor runs them. A patch bump lets the seed script publish the fixed flow over the old one.
 */
export function withOwnNodes(draft: PublicationDraft): PublicationDraft {
  const used = new Set(draft.flow.nodes.map(({ type }) => type));
  const carried = new Set((draft.flow.customNodes ?? []).map(({ id }) => id));
  const missing = draft.snapshot.catalog.filter(
    ({ id }) => used.has(id) && !id.startsWith(CORE_PREFIX) && !carried.has(id),
  );
  if (missing.length === 0) return draft;
  return {
    ...draft,
    version: nextPatch(draft.version),
    flow: { ...draft.flow, customNodes: [...(draft.flow.customNodes ?? []), ...missing] },
  };
}

/** Patch bump that keeps a prerelease tag: `1.1.0-broken` → `1.1.1-broken`. */
function nextPatch(version: string): string {
  const [core = "0.0.0", ...tag] = version.split("-");
  const [major = "0", minor = "0", patch = "0"] = core.split(".");
  const bumped = `${major}.${minor}.${String(Number(patch) + 1)}`;
  return tag.length > 0 ? `${bumped}-${tag.join("-")}` : bumped;
}

/** Minor bump that keeps a prerelease tag: `1.1.0-conflict` → `1.2.0-conflict`. */
export function nextMinor(version: string): string {
  const [core = "0.0.0", ...tag] = version.split("-");
  const [major = "0", minor = "0"] = core.split(".");
  const bumped = `${major}.${String(Number(minor) + 1)}.0`;
  return tag.length > 0 ? `${bumped}-${tag.join("-")}` : bumped;
}

function withCatalog(
  catalog: ReadonlyArray<NodeManifest>,
  types: ReadonlyArray<string>,
): NodeManifest[] {
  const known = new Set(catalog.map((manifest) => manifest.id));
  const added = [...new Set(types)].flatMap((type) => {
    const manifest = CORE_MANIFESTS[type];
    return manifest !== undefined && !known.has(type) ? [manifest] : [];
  });
  return [...catalog, ...added];
}

function withSnapshot(
  draft: PublicationDraft,
  { steps, nodes }: { steps: ReadonlyArray<FlowNode>; nodes: ReadonlyArray<FlowNode> },
): PublicationDraft["snapshot"] {
  const { snapshot } = draft;
  const catalog = withCatalog(
    snapshot.catalog,
    nodes.map((node) => node.type),
  );
  if (snapshot.state === undefined) return { ...snapshot, catalog };
  const done = Object.fromEntries(steps.map((node) => [node.id, { state: "done" as const }]));
  return {
    ...snapshot,
    catalog,
    state: { ...snapshot.state, nodes: { ...snapshot.state.nodes, ...done } },
  };
}

export function enrichDraft(
  draft: PublicationDraft,
  spec: PipelineSpec | undefined,
): PublicationDraft {
  if (spec === undefined) return draft;
  const edges = spec.edges.map(parseEdge);
  const named = new Set(edges.flatMap((edge) => [edge.from.node, edge.to.node]));
  const kept = draft.flow.nodes.filter((node) => named.has(node.id));
  const nodes = laidOut([...kept, ...spec.steps], edges);
  return {
    ...draft,
    kind: spec.kind,
    version: nextMinor(draft.version),
    flow: { ...draft.flow, nodes, edges },
    snapshot: withSnapshot(draft, { steps: spec.steps, nodes }),
  };
}
