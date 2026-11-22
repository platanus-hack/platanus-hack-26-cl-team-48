import type { NodeManifest, NodeState } from "@nodomics/protocol";
import { useCatalog, useFlowState } from "../app-context.ts";

/** A resource node (ADR 0027) describes something to deploy: it is never run and has no data. */
export const isResourceManifest = (manifest: NodeManifest | undefined): boolean =>
  manifest?.impl.kind === "resource";

export function useIsResourceNode(nodeId: string): boolean {
  const type = useFlowState((state) => state.flow.nodes.find((node) => node.id === nodeId)?.type);
  return isResourceManifest(useCatalog().find((manifest) => manifest.id === type));
}

/** A resource has no results to go stale, so it shows as not run until it fails. */
export const resourceState = (state: NodeState | undefined): NodeState | undefined =>
  state === "stale" ? undefined : state;
