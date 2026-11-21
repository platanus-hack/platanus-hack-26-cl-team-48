import type { NodeManifest } from "@nodomics/protocol";

export type LibraryGroup = {
  readonly category: string;
  readonly nodes: ReadonlyArray<NodeManifest>;
};

/** The node library: one group per category, without the boundary nodes of flows-as-nodes. */
export function groupLibrary(manifests: ReadonlyArray<NodeManifest>): LibraryGroup[] {
  const unique = new Map(
    manifests
      .filter(
        (manifest) => !(manifest.impl.kind === "builtin" && manifest.impl.name === "flow.input"),
      )
      .map((manifest) => [manifest.id, manifest]),
  );
  const groups = [...unique.values()].reduce(
    (byCategory, manifest) =>
      byCategory.set(manifest.category, [...(byCategory.get(manifest.category) ?? []), manifest]),
    new Map<string, NodeManifest[]>(),
  );
  return [...groups].map(([category, nodes]) => ({ category, nodes }));
}
