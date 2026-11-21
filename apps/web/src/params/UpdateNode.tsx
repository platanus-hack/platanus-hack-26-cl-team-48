import type { FlowNode } from "@nodomics/protocol";
import { Button } from "@nodomics/ui";
import { useStore } from "zustand";
import { useAppStores, useDispatch, useFlowState, usePersonalNodes } from "../app-context.ts";
import { personalCatalogFor } from "../library/personal-node-catalog.ts";
import { updatePersonalNode } from "../library/personal-node-edits.ts";
import { MESSAGES } from "../messages.ts";

export function UpdateNode({ node }: { readonly node: FlowNode }) {
  const flow = useFlowState((state) => state.flow);
  const personalNodes = usePersonalNodes();
  const dispatch = useDispatch();
  const savedFlows = useStore(useAppStores().savedFlowStore, ({ flows }) => flows);
  const copied = flow.customNodes?.find((manifest) => manifest.id === node.type);
  const latest = personalNodes.findLast((manifest) => manifest.id === node.type);
  if (copied === undefined || latest === undefined || !isNewer(latest.version, copied.version))
    return null;
  const update = () => {
    dispatch(
      updatePersonalNode({
        flow,
        manifest: latest,
        personalNodes: personalCatalogFor(latest, { legacy: personalNodes, saved: savedFlows }),
      }),
    );
  };
  return <Button onClick={update}>{MESSAGES.flowNodes.update(latest.version)}</Button>;
}

function isNewer(latest: string, copied: string): boolean {
  const current = copied.split(".").map(Number);
  for (const [index, value] of latest.split(".").map(Number).entries()) {
    if (value !== current[index]) return value > (current[index] ?? 0);
  }
  return false;
}
