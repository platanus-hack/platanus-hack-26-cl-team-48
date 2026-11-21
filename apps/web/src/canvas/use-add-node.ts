import type { Flow, FlowNode, NodeManifest } from "@nodomics/protocol";
import { useCallback } from "react";
import { copyPersonalFiles } from "../library/personal-node-files.ts";
import { personalManifestEdits } from "../library/personal-node-edits.ts";
import { personalCatalogFor } from "../library/personal-node-catalog.ts";
import { useAppStores } from "../app-context.ts";
import type { AppStores } from "../app-stores.ts";
import type { FlowEdit, Position } from "../flow/flow-commands.ts";
import { createFlowNode } from "./node-factory.ts";

const CASCADE_ORIGIN = { x: 80, y: 80 };
const CASCADE_STEP = 40;
export type NodeExtras = Partial<Pick<FlowNode, "params" | "label">>;
type Addition = {
  readonly manifest: NodeManifest;
  readonly position?: Position;
  readonly extras: NodeExtras;
};

export function useAddNode() {
  const stores = useAppStores();
  return useCallback(
    (manifest: NodeManifest, position?: Position, extras: NodeExtras = {}) => {
      addNode(stores, { manifest, ...(position === undefined ? {} : { position }), extras });
    },
    [stores],
  );
}

function addNode(stores: AppStores, addition: Addition) {
  const { flow } = stores.flowStore.getState().state;
  const manifest =
    flow.customNodes?.find(({ id }) => id === addition.manifest.id) ?? addition.manifest;
  const node = addedNode(flow, { ...addition, manifest });
  stores.flowStore
    .getState()
    .dispatch(
      copyPersonalFiles(
        stores,
        additionEdit(stores, addition.manifest, node),
        addition.manifest.id,
      ),
    );
  stores.selectionStore.getState().select([node.id]);
}

function addedNode(flow: Flow, addition: Addition): FlowNode {
  const node = createFlowNode({
    manifest: addition.manifest,
    position: addition.position ?? cascadePosition(flow.nodes.length),
    takenIds: new Set(flow.nodes.map((existing) => existing.id)),
  });
  return { ...node, ...addition.extras, params: { ...node.params, ...addition.extras.params } };
}

function additionEdit(stores: AppStores, manifest: NodeManifest, node: FlowNode): FlowEdit {
  return createAddEdit({
    flow: stores.flowStore.getState().state.flow,
    manifest,
    node,
    personalNodes: personalCatalogFor(manifest, {
      legacy: stores.personalLibraryStore.getState().nodes,
      saved: stores.savedFlowStore.getState().flows,
    }),
  });
}

const cascadePosition = (count: number): Position => ({
  x: CASCADE_ORIGIN.x + count * CASCADE_STEP,
  y: CASCADE_ORIGIN.y + count * CASCADE_STEP,
});

type AddEdit = {
  readonly flow: Flow;
  readonly manifest: NodeManifest;
  readonly node: FlowNode;
  readonly personalNodes: ReadonlyArray<NodeManifest>;
};
function createAddEdit({ flow, manifest, node, personalNodes }: AddEdit): FlowEdit {
  return {
    type: "batch",
    edits: [
      ...personalManifestEdits({ flow, manifest, personalNodes }),
      { type: "node.add", node },
    ],
  };
}
