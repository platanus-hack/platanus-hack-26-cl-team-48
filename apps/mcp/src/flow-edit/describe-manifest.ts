import type { NodeManifest } from "@nodomics/protocol";
import type { ManifestSummary } from "./edit-types.ts";
import { isRecord } from "./revision.ts";

export const describeManifest = (manifest: NodeManifest): ManifestSummary => ({
  type: manifest.id,
  title: manifest.name,
  inputs: manifest.inputs.map((port) => port.id),
  outputs: manifest.outputs.map((port) => port.id),
  params: Object.entries(manifest.params.properties).map(([name, schema]) => ({
    name,
    title: isRecord(schema) && typeof schema["title"] === "string" ? schema["title"] : name,
    unit: isRecord(schema) && typeof schema["x-unit"] === "string" ? schema["x-unit"] : null,
    schema,
  })),
});
