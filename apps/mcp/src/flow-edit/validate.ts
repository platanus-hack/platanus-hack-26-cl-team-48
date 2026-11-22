import { validateParams } from "@nodomics/coordinator";
import {
  nodePorts,
  type Flow,
  type FlowEdge,
  type FlowNode,
  type NodeManifest,
} from "@nodomics/protocol";
import { edgeTarget, resolvePort } from "./connection-edits.ts";
import type { ValidationIssue } from "./edit-types.ts";
import { crowdedInputs, crowdedMessage, typeMismatch } from "./port-contract.ts";
import { manifestOf } from "./node-edits.ts";

export function validateFlow(
  flow: Flow,
  catalog: readonly NodeManifest[],
): { valid: boolean; issues: readonly ValidationIssue[] } {
  const issues = [
    ...flow.nodes.flatMap((node) => nodeIssues(flow, node, catalog)),
    ...connectionIssues(flow, catalog),
  ];
  return { valid: issues.length === 0, issues };
}
function nodeIssues(
  flow: Flow,
  node: FlowNode,
  catalog: readonly NodeManifest[],
): readonly ValidationIssue[] {
  const manifest = manifestOf(flow, node.type, catalog);
  if (manifest === undefined)
    return [{ nodeId: node.id, message: `Unknown node type: ${node.type}` }];
  return [
    ...validateParams({ ...node, origin: node.id, manifest }).map(({ nodeId, message }) => ({
      nodeId,
      message,
    })),
    ...nodePorts(manifest, node.params)
      .inputs.filter(
        (port) =>
          !port.optional &&
          !flow.edges.some((edge) => edge.to.node === node.id && edge.to.port === port.id),
      )
      .map((port) => ({ nodeId: node.id, message: `Missing input: ${port.id}` })),
  ];
}
function connectionIssues(
  flow: Flow,
  catalog: readonly NodeManifest[],
): readonly ValidationIssue[] {
  const issues = flow.edges.flatMap((edge) => {
    const from = resolvePort({
      flow,
      reference: `${edge.from.node}.${edge.from.port}`,
      side: "outputs",
      catalog,
    });
    const to = resolvePort({
      flow,
      reference: `${edge.to.node}.${edge.to.port}`,
      side: "inputs",
      catalog,
    });
    const mismatch =
      from.ok && to.ok ? typeMismatch(from.value.spec, to.value.spec, edgeTarget(edge)) : undefined;
    return [
      ...(from.ok ? [] : [{ nodeId: edge.from.node, message: from.error.message }]),
      ...(to.ok ? [] : [{ nodeId: edge.to.node, message: to.error.message }]),
      ...(mismatch === undefined ? [] : [{ nodeId: edge.to.node, message: mismatch }]),
    ];
  });
  return [...issues, ...crowdedInputIssues(flow, catalog)];
}
function crowdedInputIssues(
  flow: Flow,
  catalog: readonly NodeManifest[],
): readonly ValidationIssue[] {
  const isMulti = (edge: FlowEdge) => {
    const to = resolvePort({
      flow,
      reference: `${edge.to.node}.${edge.to.port}`,
      side: "inputs",
      catalog,
    });
    return !to.ok || to.value.spec.multi === true;
  };
  return crowdedInputs(flow, isMulti).map((edge) => ({
    nodeId: edge.to.node,
    message: crowdedMessage(edge),
  }));
}
