import { applyParamDefaults } from "@nodomics/coordinator";
import { err, Id, ok, parse, type Flow, type NodeManifest, type Result } from "@nodomics/protocol";
import type { CodeNodeArgs, EditError } from "./edit-types.ts";

const NODE_SPACING = 240;
const CODE_PREFIX = "code.";
export const manifestOf = (
  flow: Flow,
  type: string,
  catalog: readonly NodeManifest[],
): NodeManifest | undefined =>
  flow.customNodes?.find((manifest) => manifest.id === type) ??
  catalog.find((manifest) => manifest.id === type);
export function addNode(
  flow: Flow,
  args: { type: string; nodeId: string },
  catalog: readonly NodeManifest[],
): Result<Flow, EditError> {
  if (!parse(Id, args.nodeId).ok) return err({ message: `Invalid node id: ${args.nodeId}` });
  if (flow.nodes.some((node) => node.id === args.nodeId))
    return err({ message: `Node already exists: ${args.nodeId}` });
  const manifest = manifestOf(flow, args.type, catalog);
  if (manifest === undefined) return err({ message: `Unknown node type: ${args.type}` });
  return ok({
    ...flow,
    nodes: [
      ...flow.nodes,
      {
        id: args.nodeId,
        type: args.type,
        version: manifest.version,
        params: structuredClone(applyParamDefaults(manifest.params, {})),
        position: nextPosition(flow),
      },
    ],
  });
}
function nextPosition(flow: Flow): { x: number; y: number } {
  return {
    x:
      flow.nodes.length === 0
        ? 0
        : Math.max(...flow.nodes.map((node) => node.position.x)) + NODE_SPACING,
    y: 0,
  };
}
export function removeNode(flow: Flow, nodeId: string): Result<Flow, EditError> {
  const node = flow.nodes.find((node) => node.id === nodeId);
  if (node === undefined) return err({ message: `Unknown node: ${nodeId}` });
  return ok({
    ...flow,
    nodes: flow.nodes.filter((node) => node.id !== nodeId),
    edges: flow.edges.filter((edge) => edge.from.node !== nodeId && edge.to.node !== nodeId),
    ...(flow.customNodes === undefined
      ? {}
      : {
          customNodes: flow.customNodes.filter(
            (manifest) =>
              manifest.id !== `${CODE_PREFIX}${nodeId}` ||
              flow.nodes.some((other) => other.id !== nodeId && other.type === node.type),
          ),
        }),
  });
}
export function createCodeNode(
  flow: Flow,
  args: CodeNodeArgs,
  catalog: readonly NodeManifest[],
): Result<Flow, EditError> {
  const manifest = codeManifest(args);
  if (!parse(Id, manifest.id).ok || !validPorts(args))
    return err({ message: `Invalid code node or ports: ${args.nodeId}` });
  if (manifestOf(flow, manifest.id, catalog) !== undefined)
    return err({ message: `Code type already exists: ${manifest.id}` });
  return addNode(
    { ...flow, customNodes: [...(flow.customNodes ?? []), manifest] },
    { type: manifest.id, nodeId: args.nodeId },
    catalog,
  );
}
export function updateCodeNode(flow: Flow, args: CodeNodeArgs): Result<Flow, EditError> {
  if (
    !flow.nodes.some(
      (node) => node.id === args.nodeId && node.type === `${CODE_PREFIX}${args.nodeId}`,
    ) ||
    !flow.customNodes?.some((manifest) => manifest.id === `${CODE_PREFIX}${args.nodeId}`)
  )
    return err({ message: `Not a code node: ${args.nodeId}` });
  if (!validPorts(args)) return err({ message: `Invalid code ports: ${args.nodeId}` });
  return ok({
    ...flow,
    customNodes: flow.customNodes.map((manifest) =>
      manifest.id === `${CODE_PREFIX}${args.nodeId}` ? codeManifest(args) : manifest,
    ),
    edges: flow.edges.filter(
      (edge) =>
        (edge.from.node !== args.nodeId || args.outputs.includes(edge.from.port)) &&
        (edge.to.node !== args.nodeId || args.inputs.includes(edge.to.port)),
    ),
  });
}
const validPorts = (args: CodeNodeArgs): boolean =>
  [args.inputs, args.outputs].every(
    (ports) => new Set(ports).size === ports.length && ports.every((port) => parse(Id, port).ok),
  );
const codeManifest = (args: CodeNodeArgs): NodeManifest => ({
  id: `${CODE_PREFIX}${args.nodeId}`,
  version: "0.1.0",
  name: args.nodeId,
  category: "Código",
  inputs: args.inputs.map((id) => ({ id, type: "table" })),
  outputs: args.outputs.map((id) => ({ id, type: "table" })),
  params: { type: "object", properties: {} },
  ...(args.language === "python"
    ? { impl: { kind: "python", code: args.code, entry: "run" }, requires: { runtime: "python" } }
    : { impl: { kind: "sql", template: args.code } }),
});
