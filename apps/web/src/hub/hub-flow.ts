import type { Flow, FlowNode, NodeManifest } from "@nodomics/protocol";
import { describeFormFields, type FormField } from "../form/form-fields.ts";
import { keyValuesOf } from "../form/key-values.ts";

type Catalog = ReadonlyArray<NodeManifest>;

/**
 * The flow without what only makes sense on the author's machine (ADR 0018): the files its
 * sources point to and which stored credentials its headers use. Applied when publishing and
 * again when opening someone else's flow, so a credential is never used without the user's choice.
 */
export function withoutPrivateParams(flow: Flow, catalog: Catalog): Flow {
  const manifests = [...(flow.customNodes ?? []), ...catalog];
  const clean = (node: FlowNode) => cleanNode(node, manifests);
  return {
    ...flow,
    nodes: flow.nodes.map(clean),
    ...(flow.customNodes === undefined
      ? {}
      : { customNodes: flow.customNodes.map((manifest) => cleanGraph(manifest, clean)) }),
  };
}

function cleanGraph(manifest: NodeManifest, clean: (node: FlowNode) => FlowNode): NodeManifest {
  if (manifest.impl.kind !== "flow") return manifest;
  const { graph } = manifest.impl;
  return {
    ...manifest,
    impl: { ...manifest.impl, graph: { ...graph, nodes: graph.nodes.map(clean) } },
  };
}

function cleanNode(node: FlowNode, catalog: Catalog): FlowNode {
  const manifest = catalog.find(({ id }) => id === node.type);
  if (manifest === undefined) return node;
  const fields = describeFormFields(manifest.params);
  const widgetOf = (name: string) => fields.find((field) => field.name === name)?.widget;
  return {
    ...node,
    params: Object.fromEntries(
      Object.entries(node.params).flatMap(([name, value]) =>
        cleanParam(widgetOf(name), value).map((cleaned) => [name, cleaned]),
      ),
    ),
  };
}

/** No values drops the param; one value keeps it, cleaned. */
function cleanParam(
  widget: FormField["widget"] | undefined,
  value: unknown,
): ReadonlyArray<unknown> {
  switch (widget?.kind) {
    case "source":
      return [];
    case "key-values":
      return [
        keyValuesOf(value).map(({ name, value: text }) => ({
          name,
          ...(text === undefined ? {} : { value: text }),
        })),
      ];
    default:
      return [value];
  }
}
