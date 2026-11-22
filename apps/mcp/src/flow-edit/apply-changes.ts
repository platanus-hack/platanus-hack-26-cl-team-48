import { err, ok, type Flow, type Result } from "@nodomics/protocol";
import { edgeTarget } from "./connection-edits.ts";
import { diffFlows } from "./diff.ts";
import type { Change, EditError } from "./edit-types.ts";

export function applyChanges(
  base: Flow,
  draft: Flow,
  changeIds: readonly string[],
): Result<Flow, EditError> {
  const changes = diffFlows(base, draft);
  const unknown = changeIds.find((id) => !changes.some((change) => change.id === id));
  if (unknown !== undefined) return err({ message: `Unknown change: ${unknown}` });
  const result = changes
    .filter((change) => changeIds.includes(change.id))
    .reduce((flow, change) => applyChange({ flow, draft, change }), base);
  const issue = consistencyIssue(result);
  return issue === undefined ? ok(result) : err({ message: issue });
}
function applyChange({ flow, draft, change }: { flow: Flow; draft: Flow; change: Change }): Flow {
  switch (change.kind) {
    case "add_node":
      return {
        ...flow,
        nodes: [...flow.nodes, ...draft.nodes.filter((node) => node.id === change.target)],
      };
    case "remove_node":
      return {
        ...flow,
        nodes: flow.nodes.filter((node) => node.id !== change.target),
        edges: flow.edges.filter(
          (edge) => edge.from.node !== change.target && edge.to.node !== change.target,
        ),
        ...(flow.customNodes === undefined
          ? {}
          : {
              customNodes: flow.customNodes.filter(
                (manifest) => manifest.id !== `code.${change.target}`,
              ),
            }),
      };
    case "set_param":
      return applyParamChange(flow, draft, change.target);
    case "connect":
      return {
        ...flow,
        edges: [...flow.edges, ...draft.edges.filter((edge) => edgeTarget(edge) === change.target)],
      };
    case "disconnect":
      return { ...flow, edges: flow.edges.filter((edge) => edgeTarget(edge) !== change.target) };
    case "add_custom_node":
    case "update_custom_node":
      return applyCodeChange(flow, draft, change.target);
  }
}
function applyParamChange(flow: Flow, draft: Flow, target: string): Flow {
  const node = [...draft.nodes]
    .sort((a, b) => b.id.length - a.id.length)
    .find((node) => target.startsWith(`${node.id}.`));
  if (node === undefined) return flow;
  const name = target.slice(node.id.length + 1);
  return {
    ...flow,
    nodes: flow.nodes.map((current) =>
      current.id === node.id
        ? {
            ...current,
            params: Object.fromEntries(
              Object.entries({ ...current.params, [name]: node.params[name] }).filter(
                ([, value]) => value !== undefined,
              ),
            ),
          }
        : current,
    ),
  };
}
function applyCodeChange(flow: Flow, draft: Flow, target: string): Flow {
  const type = draft.nodes.find((node) => node.id === target)?.type ?? target;
  return {
    ...flow,
    customNodes: [
      ...(flow.customNodes ?? []).filter((manifest) => manifest.id !== type),
      ...(draft.customNodes ?? []).filter((manifest) => manifest.id === type),
    ],
  };
}
function consistencyIssue(flow: Flow): string | undefined {
  const missing = flow.edges.find(
    (edge) =>
      !flow.nodes.some((node) => node.id === edge.from.node) ||
      !flow.nodes.some((node) => node.id === edge.to.node),
  );
  if (missing !== undefined) return `Connection needs a missing node: ${edgeTarget(missing)}`;
  const missingCode = flow.nodes.find(
    (node) =>
      node.type.startsWith("code.") &&
      !flow.customNodes?.some((manifest) => manifest.id === node.type),
  );
  return missingCode === undefined ? undefined : `Missing custom manifest: ${missingCode.type}`;
}
