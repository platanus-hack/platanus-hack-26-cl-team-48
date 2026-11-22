import type { Flow, FlowEdge, FlowNode } from "@nodomics/protocol";
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
/** Same id with another type or version: it is a different node, so it is removed and added. */
function replacedIds(base: Flow, draft: Flow): ReadonlySet<string> {
  return new Set(
    draft.nodes
      .filter((node) => {
        const before = base.nodes.find((other) => other.id === node.id);
        return (
          before !== undefined && (before.type !== node.type || before.version !== node.version)
        );
      })
      .map((node) => node.id),
  );
}
const isAbsentFrom = (flow: Flow, replaced: ReadonlySet<string>) => (node: FlowNode) =>
  replaced.has(node.id) || !flow.nodes.some((other) => other.id === node.id);
// Removals come first so a replacement removes the old node before adding the new one.
function nodeChanges(base: Flow, draft: Flow): Change[] {
  const replaced = replacedIds(base, draft);
  return [
    ...base.nodes
      .filter(isAbsentFrom(draft, replaced))
      .map((node) => change("remove_node", node.id, { before: node })),
    ...draft.nodes
      .filter(isAbsentFrom(base, replaced))
      .map((node) => change("add_node", node.id, { after: node })),
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
  const replaced = replacedIds(base, draft);
  return draft.nodes.flatMap((node) => {
    const before = base.nodes.find((other) => other.id === node.id);
    return before === undefined || replaced.has(node.id) ? [] : changedParams(before, node);
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
/** A connection of a replaced node is reconnected: removing the old node drops it. Disconnections go first. */
function edgeChanges(base: Flow, draft: Flow): Change[] {
  const replaced = replacedIds(base, draft);
  const isNew = (flow: Flow) => (edge: FlowEdge) =>
    replaced.has(edge.from.node) ||
    replaced.has(edge.to.node) ||
    !flow.edges.some((other) => edgeTarget(edge) === edgeTarget(other));
  return [
    ...base.edges
      .filter(isNew(draft))
      .map((edge) => change("disconnect", edgeTarget(edge), { before: edge })),
    ...draft.edges
      .filter(isNew(base))
      .map((edge) => change("connect", edgeTarget(edge), { after: edge })),
  ];
}
