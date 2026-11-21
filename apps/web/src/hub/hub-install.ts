import type { NodeManifest } from "@nodomics/protocol";

/**
 * A published node and the author's custom nodes it uses inside, so it runs on its own once
 * installed in "Mis nodos" (ADR 0018). The rest of the author's custom nodes stay behind.
 */
export function manifestsToInstall(
  published: NodeManifest,
  customNodes: ReadonlyArray<NodeManifest>,
): ReadonlyArray<NodeManifest> {
  const installed = new Map<string, NodeManifest>();
  const visit = (manifest: NodeManifest) => {
    if (installed.has(manifest.id)) return;
    installed.set(manifest.id, manifest);
    usedTypes(manifest).forEach((type) => {
      const used = customNodes.find(({ id }) => id === type);
      if (used !== undefined) visit(used);
    });
  };
  visit(published);
  return [...installed.values()];
}

const usedTypes = ({ impl }: NodeManifest): ReadonlyArray<string> =>
  impl.kind === "flow" ? impl.graph.nodes.map(({ type }) => type) : [];
