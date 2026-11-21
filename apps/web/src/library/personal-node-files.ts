import type { NodeManifest } from "@nodomics/protocol";
import type { AppStores } from "../app-stores.ts";
import type { FlowEdit } from "../flow/flow-edits.ts";
import { applyCommand, createFlowState } from "../flow/flow-commands.ts";
import type { SavedFlow } from "./flow-library.ts";
import { sourceTargets, rebindSourceTargets } from "./source-reconnection.ts";

export function copyPersonalFiles(stores: AppStores, edit: FlowEdit, originId: string): FlowEdit {
  return copyPersonalEdit(
    { stores, owner: manifestOwner(stores.savedFlowStore.getState().flows, originId) },
    edit,
  );
}

type CopyContext = { readonly stores: AppStores; readonly owner: SavedFlow | undefined };
function copyPersonalEdit(context: CopyContext, edit: FlowEdit): FlowEdit {
  if (edit.type === "batch")
    return { ...edit, edits: edit.edits.map((item) => copyPersonalEdit(context, item)) };
  if (edit.type !== "customNode.add") return edit;
  return { ...edit, manifest: copyManifestFiles(context, edit.manifest) };
}

function copyManifestFiles({ stores, owner }: CopyContext, manifest: NodeManifest): NodeManifest {
  if (manifest.impl.kind !== "flow") return manifest;
  const saved = stores.savedFlowStore.getState();
  const targets = sourceTargets(
    { ...stores.flowStore.getState().state.flow, nodes: [], customNodes: [manifest] },
    stores.engineStore.getState().state.catalog,
  );
  const ids = Object.fromEntries(
    targets.map(({ sourceId }) => [sourceId, `saved_${crypto.randomUUID()}`]),
  );
  stores.savedFlowStore.setState({
    files: { ...saved.files, ...copiedFiles(targets, ids, owner) },
  });
  return reboundManifest(manifest, targets, ids);
}

type Targets = ReturnType<typeof sourceTargets>;
function manifestOwner(flows: ReadonlyArray<SavedFlow>, manifestId: string) {
  return (
    flows.find((flow) => flow.node?.manifest.id === manifestId) ??
    flows.find((flow) => flow.flow.customNodes?.some(({ id }) => id === manifestId))
  );
}

function copiedFiles(
  targets: Targets,
  ids: Readonly<Record<string, string>>,
  owner: SavedFlow | undefined,
) {
  return Object.fromEntries<string>(
    targets.flatMap(({ sourceId }) => {
      const key = owner?.files[sourceId];
      const id = ids[sourceId];
      return key === undefined || id === undefined ? [] : [[id, key]];
    }),
  );
}

function reboundManifest(
  manifest: NodeManifest,
  targets: Targets,
  ids: Readonly<Record<string, string>>,
) {
  const initial = createFlowState();
  return (
    applyCommand(
      { ...initial, flow: { ...initial.flow, customNodes: [manifest] } },
      {
        type: "sources.rebind",
        targets: rebindSourceTargets(targets, ids),
      },
    ).flow.customNodes?.[0] ?? manifest
  );
}
