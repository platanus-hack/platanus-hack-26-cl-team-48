import type { Flow, FlowNode } from "@nodomics/protocol";
import { edgeTarget } from "./connection-edits.ts";
import type { Change, ChangeKind } from "./edit-types.ts";
import { canonicalJson } from "./revision.ts";

export const diffFlows = (base: Flow, draft: Flow): readonly Change[] => [
  ...nodeChanges(base, draft),
  ...codeChanges(base, draft),
  ...paramChanges(base, draft),
  ...edgeChanges(base, draft),
];
const change = (
  kind: ChangeKind,
  target: string,
  values: { before?: unknown; after?: unknown },
): Change => ({ id: `${kind}:${target}`, kind, target, ...values });
function nodeChanges(base: Flow, draft: Flow): Change[] {
  return [
    ...draft.nodes
      .filter((node) => !base.nodes.some((other) => other.id === node.id))
      .map((node) => change("add_node", node.id, { after: node })),
    ...base.nodes
      .filter((node) => !draft.nodes.some((other) => other.id === node.id))
      .map((node) => change("remove_node", node.id, { before: node })),
  ];
}
function codeChanges(base: Flow, draft: Flow): Change[] {
  return (draft.customNodes ?? []).flatMap((manifest) => {
    const before = base.customNodes?.find((other) => other.id === manifest.id);
    const target = draft.nodes.find((node) => node.type === manifest.id)?.id ?? manifest.id;
    return canonicalJson(before) === canonicalJson(manifest)
      ? []
      : [
          change(before === undefined ? "add_custom_node" : "update_custom_node", target, {
            ...(before === undefined ? {} : { before }),
            after: manifest,
          }),
        ];
  });
}
function paramChanges(base: Flow, draft: Flow): Change[] {
  return draft.nodes.flatMap((node) => {
    const before = base.nodes.find((other) => other.id === node.id);
    return before === undefined ? [] : changedParams(before, node);
  });
}
function changedParams(base: FlowNode, draft: FlowNode): Change[] {
  return [...new Set([...Object.keys(base.params), ...Object.keys(draft.params)])].flatMap(
    (name) =>
      canonicalJson(base.params[name]) === canonicalJson(draft.params[name])
        ? []
        : [
            change("set_param", `${draft.id}.${name}`, {
              before: base.params[name],
              after: draft.params[name],
            }),
          ],
  );
}
function edgeChanges(base: Flow, draft: Flow): Change[] {
  return [
    ...draft.edges
      .filter((edge) => !base.edges.some((other) => edgeTarget(edge) === edgeTarget(other)))
      .map((edge) => change("connect", edgeTarget(edge), { after: edge })),
    ...base.edges
      .filter((edge) => !draft.edges.some((other) => edgeTarget(edge) === edgeTarget(other)))
      .map((edge) => change("disconnect", edgeTarget(edge), { before: edge })),
  ];
}
