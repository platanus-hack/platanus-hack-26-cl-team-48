import { hubNodeId, type PublicationKind } from "@nodomics/hub";
import { err, ok, type Flow, type NodeManifest, type Result } from "@nodomics/protocol";
import { nodeFromFlow, type FlowNodeIssue } from "../library/flow-node.ts";
import { withoutPrivateParams } from "./hub-flow.ts";

const NODE_ENTRY = "flow.node";

export type PublicationContent = {
  readonly kind: PublicationKind;
  readonly flow: Flow;
  readonly manifest?: NodeManifest;
};

type Source = {
  readonly flowId: string;
  readonly flow: Flow;
  readonly catalog: ReadonlyArray<NodeManifest>;
};
type Target = { readonly handle: string; readonly slug: string; readonly version: string };

/** What a saved flow publishes: itself, and the node it defines when it has a node entry. */
export function publicationContent(
  { flowId, flow, catalog }: Source,
  { handle, slug, version }: Target,
): Result<PublicationContent, FlowNodeIssue> {
  const clean = withoutPrivateParams(flow, catalog);
  if (!clean.nodes.some((node) => node.type === NODE_ENTRY))
    return ok({ kind: "flow", flow: clean });
  const manifest = nodeFromFlow({ id: flowId, version, flow: clean }, catalog);
  return manifest.ok
    ? ok({
        kind: "node",
        flow: clean,
        manifest: { ...manifest.value, id: hubNodeId(handle, slug) },
      })
    : err(manifest.error);
}
