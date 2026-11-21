import type { Flow, NodeManifest } from "@nodomics/protocol";
import type { FlowEdit } from "../flow/flow-edits.ts";
type ManifestEdit = {
  readonly flow: Flow;
  readonly manifest: NodeManifest;
  readonly personalNodes: ReadonlyArray<NodeManifest>;
};

export function personalManifestEdits(deps: ManifestEdit): ReadonlyArray<FlowEdit> {
  return personalDependencies(
    deps.flow.customNodes?.find(({ id }) => id === deps.manifest.id) ?? deps.manifest,
    [...deps.personalNodes, ...(deps.flow.customNodes ?? [])],
  )
    .filter((manifest) => !deps.flow.customNodes?.some((existing) => existing.id === manifest.id))
    .map((manifest) => ({ type: "customNode.add", manifest }));
}

export function updatePersonalNode(deps: ManifestEdit): FlowEdit {
  return {
    type: "batch",
    edits: [
      ...personalDependencies(deps.manifest, deps.personalNodes).flatMap((manifest): FlowEdit[] => [
        { type: "customNode.set", manifest },
        ...deps.flow.nodes
          .filter((node) => node.type === manifest.id)
          .map((node): FlowEdit => ({
            type: "node.version",
            nodeId: node.id,
            version: manifest.version,
          })),
      ]),
    ],
  };
}

function personalDependencies(
  manifest: NodeManifest,
  catalog: ReadonlyArray<NodeManifest>,
): ReadonlyArray<NodeManifest> {
  const found = new Map<string, NodeManifest>();
  const visit = (current: NodeManifest) => {
    if (found.has(current.id)) return;
    found.set(current.id, current);
    if (current.impl.kind === "flow")
      current.impl.graph.nodes.forEach((node) => {
        const dependency = catalog.findLast((candidate) => candidate.id === node.type);
        if (dependency !== undefined) visit(dependency);
      });
  };
  if (catalog.some((candidate) => candidate.id === manifest.id)) visit(manifest);
  return [...found.values()];
}
