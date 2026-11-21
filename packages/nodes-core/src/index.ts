import { NodeManifest, parse, type SourceFormat } from "@nodomics/protocol";
import catalog from "./catalog.generated.json" with { type: "json" };

export type SampleDataset = { readonly url: string; readonly format: SourceFormat };

/** The official nodes, generated from `nodes/<id>/` by `pnpm --filter @nodomics/nodes-core generate`. */
export const coreNodes: readonly NodeManifest[] = catalog.map(parseCatalogEntry);

/** Sample sources by the id that `core.source.sample` reads (`sample.<dataset>`). */
export const sampleDatasets: Readonly<Record<string, SampleDataset>> = {
  "sample.ventas": {
    url: new URL("../datasets/ventas.csv", import.meta.url).href,
    format: "csv",
  },
};

function parseCatalogEntry(entry: unknown): NodeManifest {
  const manifest = parse(NodeManifest, entry);
  if (!manifest.ok) {
    throw new Error(`The generated node catalog is invalid: ${JSON.stringify(manifest.error)}`);
  }
  return manifest.value;
}
