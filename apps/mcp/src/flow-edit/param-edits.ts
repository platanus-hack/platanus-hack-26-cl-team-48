import { validateParams } from "@nodomics/coordinator";
import { err, ok, type Flow, type NodeManifest, type Result } from "@nodomics/protocol";
import type { EditError } from "./edit-types.ts";
import { manifestOf } from "./node-edits.ts";

export function setParam(
  flow: Flow,
  args: { nodeId: string; name: string; value: unknown },
  catalog: readonly NodeManifest[],
): Result<Flow, EditError> {
  const node = flow.nodes.find((node) => node.id === args.nodeId);
  if (node === undefined) return err({ message: `Unknown node: ${args.nodeId}` });
  const manifest = manifestOf(flow, node.type, catalog);
  if (manifest === undefined || !Object.hasOwn(manifest.params.properties, args.name))
    return err({ message: `Unknown parameter: ${args.name}` });
  const params = { ...node.params, [args.name]: args.value };
  const issue = validateParams({ ...node, origin: node.id, params, manifest }).find(
    (issue) => issue.param === args.name || issue.param === "",
  );
  return issue === undefined
    ? ok({
        ...flow,
        nodes: flow.nodes.map((current) =>
          current.id === node.id ? { ...current, params } : current,
        ),
      })
    : err({ message: issue.message });
}
