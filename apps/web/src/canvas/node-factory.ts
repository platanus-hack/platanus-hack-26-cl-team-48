import type { FlowNode, NodeManifest } from "@nodomics/protocol";
import type { Position } from "../flow/flow-commands.ts";
import { describeFormFields } from "../form/form-fields.ts";
import { createUniqueId, slugify } from "../flow/unique-id.ts";

const FALLBACK_ID = "nodo";

/** A new instance of `manifest`, with every parameter that declares a default already filled. */
export function createFlowNode(request: {
  readonly manifest: NodeManifest;
  readonly position: Position;
  readonly takenIds: ReadonlySet<string>;
}): FlowNode {
  const { manifest, position, takenIds } = request;
  return {
    id: createUniqueId(slugify(manifest.id.split(".").at(-1) ?? "", FALLBACK_ID), takenIds),
    type: manifest.id,
    version: manifest.version,
    params: Object.fromEntries(
      describeFormFields(manifest.params)
        .filter((field) => field.defaultValue !== undefined)
        .map((field) => [field.name, field.defaultValue]),
    ),
    position,
  };
}
