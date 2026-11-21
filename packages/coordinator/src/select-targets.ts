import type { CacheKeys } from "./cache-keys.ts";
import type { FlowAnalysis } from "./analyze-flow.ts";

/** The keys of the nodes a run needs: the targets (by top-level or internal id) and everything upstream. */
export function selectTargets(
  analysis: FlowAnalysis,
  targets: ReadonlyArray<string> | undefined,
): CacheKeys {
  if (targets === undefined) return analysis.keys;
  const needed = collectUpstream(
    analysis,
    analysis.graph.nodes
      .filter((node) => targets.includes(node.origin) || targets.includes(node.id))
      .map((node) => node.id),
  );
  return new Map([...analysis.keys].filter(([nodeId]) => needed.has(nodeId)));
}

function collectUpstream(analysis: FlowAnalysis, nodeIds: ReadonlyArray<string>): Set<string> {
  const needed = new Set<string>();
  const visit = (nodeId: string): void => {
    if (needed.has(nodeId)) return;
    needed.add(nodeId);
    analysis.graph.edges
      .filter((edge) => edge.to.node === nodeId)
      .forEach((edge) => {
        visit(edge.from.node);
      });
  };
  nodeIds.forEach(visit);
  return needed;
}
