import type { NodeManifest } from "@nodomics/protocol";

/** Node manifests by node type id. */
export type Catalog = ReadonlyMap<string, NodeManifest>;

export const toCatalog = (manifests: ReadonlyArray<NodeManifest>): Catalog =>
  new Map(manifests.map((manifest) => [manifest.id, manifest]));
