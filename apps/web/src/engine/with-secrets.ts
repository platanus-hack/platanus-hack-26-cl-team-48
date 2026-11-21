import type { Flow, FlowNode, NodeManifest } from "@nodomics/protocol";
import { describeFormFields } from "../form/form-fields.ts";
import { parseKeyValue } from "../form/key-values.ts";
import type { Secret } from "../library/flow-library.ts";

export function withSecrets(
  flow: Flow,
  catalog: ReadonlyArray<NodeManifest>,
  secrets: ReadonlyArray<Secret>,
): Flow {
  const manifests = [...(flow.customNodes ?? []), ...catalog];
  const resolveNode = (node: FlowNode) => resolveParams(node, manifests, secrets);
  return {
    ...flow,
    nodes: flow.nodes.map(resolveNode),
    ...(flow.customNodes === undefined
      ? {}
      : {
          customNodes: flow.customNodes.map((manifest) => resolveGraph(manifest, resolveNode)),
        }),
  };
}

function resolveGraph(
  manifest: NodeManifest,
  resolveNode: (node: FlowNode) => FlowNode,
): NodeManifest {
  return manifest.impl.kind === "flow"
    ? {
        ...manifest,
        impl: {
          ...manifest.impl,
          graph: {
            ...manifest.impl.graph,
            nodes: manifest.impl.graph.nodes.map(resolveNode),
          },
        },
      }
    : manifest;
}

function resolveParams(
  node: FlowNode,
  catalog: ReadonlyArray<NodeManifest>,
  secrets: ReadonlyArray<Secret>,
): FlowNode {
  const manifest = catalog.find(({ id, version }) => id === node.type && version === node.version);
  if (manifest === undefined) return node;
  const fields = describeFormFields(manifest.params);
  return {
    ...node,
    params: Object.fromEntries(
      Object.entries(node.params).map(([name, value]) => [
        name,
        fields.some((field) => field.name === name && field.widget.kind === "key-values")
          ? resolveList(value, secrets)
          : value,
      ]),
    ),
  };
}

function resolveList(value: unknown, secrets: ReadonlyArray<Secret>): unknown {
  return Array.isArray(value)
    ? value.map((item: unknown) => {
        const entry = parseKeyValue(item);
        if (entry?.secret === undefined) return item;
        const secret = secrets.find(({ name }) => name === entry.secret);
        return { name: entry.name, ...(secret === undefined ? {} : { value: secret.value }) };
      })
    : value;
}
