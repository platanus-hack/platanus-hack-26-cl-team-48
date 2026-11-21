import type { Flow, NodeManifest } from "@nodomics/protocol";
import type { StoredFile } from "./flow-library.ts";

export function planSourceReconnection(deps: {
  readonly flow: Flow;
  readonly catalog: ReadonlyArray<NodeManifest>;
  readonly sessionSources: ReadonlySet<string>;
}): ReadonlyArray<string> {
  return [
    ...new Set(
      sourceTargets(deps.flow, deps.catalog)
        .map(({ sourceId }) => sourceId)
        .filter((id) => !deps.sessionSources.has(id)),
    ),
  ];
}

export type SourceTarget = {
  readonly nodeId: string;
  readonly param: string;
  readonly sourceId: string;
  readonly manifestId?: string;
};

export function sourceTargets(
  flow: Flow,
  catalog: ReadonlyArray<NodeManifest>,
): ReadonlyArray<SourceTarget> {
  const manifests = [...(flow.customNodes ?? []), ...catalog];
  return [
    ...graphSourceTargets(flow.nodes, manifests),
    ...(flow.customNodes ?? []).flatMap((manifest) =>
      manifest.impl.kind === "flow"
        ? graphSourceTargets(manifest.impl.graph.nodes, manifests).map((target) => ({
            ...target,
            manifestId: manifest.id,
          }))
        : [],
    ),
  ];
}

function graphSourceTargets(
  nodes: Flow["nodes"],
  catalog: ReadonlyArray<NodeManifest>,
): ReadonlyArray<SourceTarget> {
  return nodes.flatMap((node) =>
    Object.entries(catalog.find(({ id }) => id === node.type)?.params.properties ?? {}).flatMap(
      ([param, schema]) =>
        isSourceSchema(schema) && typeof node.params[param] === "string"
          ? [{ nodeId: node.id, param, sourceId: node.params[param] }]
          : [],
    ),
  );
}

function isSourceSchema(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    "x-nodomics" in value &&
    typeof value["x-nodomics"] === "object" &&
    value["x-nodomics"] !== null &&
    "widget" in value["x-nodomics"] &&
    value["x-nodomics"].widget === "source"
  );
}
export function sourceRecovery(
  file: StoredFile | undefined,
): "missing" | "upload" | "permission" | "choose" {
  if (file === undefined) return "missing";
  if (file.bytes !== undefined) return "upload";
  return file.handle === undefined ? "choose" : "permission";
}

export function rebindSourceTargets(
  targets: ReadonlyArray<SourceTarget>,
  ids: Readonly<Record<string, string>>,
) {
  return targets.flatMap((target) => {
    const sourceId = ids[target.sourceId];
    return sourceId === undefined
      ? []
      : [{ ...target, sourceId, previousSourceId: target.sourceId }];
  });
}
