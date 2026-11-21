import { MESSAGES } from "../messages.ts";
import type { SavedFlow } from "./flow-library.ts";
import { myNodeId } from "./flow-node.ts";
import { nextNodeVersion } from "./node-version.ts";

export function duplicateSavedFlow(
  saved: SavedFlow,
  identity: { readonly id: string; readonly updatedAt: number },
): SavedFlow {
  const { node: previous, ...record } = saved;
  const node = duplicateNode(previous, identity.id);
  return {
    ...record,
    ...identity,
    visibility: "private",
    name: MESSAGES.savedFlows.copy(saved.name),
    flow: { ...saved.flow, name: MESSAGES.savedFlows.copy(saved.name) },
    ...(node === undefined ? {} : { node }),
  };
}

function duplicateNode(previous: SavedFlow["node"], id: string): SavedFlow["node"] {
  if (previous === undefined) return undefined;
  const manifest = { ...previous.manifest, id: myNodeId(id) };
  const version = nextNodeVersion(undefined, manifest);
  return { ...version, manifest: { ...manifest, version: version.version } };
}
