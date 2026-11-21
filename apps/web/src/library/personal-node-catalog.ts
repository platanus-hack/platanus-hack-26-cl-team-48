import type { NodeManifest } from "@nodomics/protocol";
import type { SavedFlow } from "./flow-library.ts";

type CatalogSources = {
  readonly legacy: ReadonlyArray<NodeManifest>;
  readonly saved: ReadonlyArray<SavedFlow>;
};
export function personalCatalog({ legacy, saved }: CatalogSources): ReadonlyArray<NodeManifest> {
  return [
    ...legacy,
    ...saved.flatMap((flow) => (flow.node === undefined ? [] : [flow.node.manifest])),
  ];
}

export function personalCatalogFor(
  manifest: NodeManifest,
  sources: CatalogSources,
): ReadonlyArray<NodeManifest> {
  return [
    ...personalCatalog(sources),
    ...(sources.saved.find((saved) => saved.node?.manifest.id === manifest.id)?.flow.customNodes ??
      []),
  ];
}
