import { useAppStores, useDispatch } from "../app-context.ts";
import { createUniqueId } from "../flow/unique-id.ts";
import { NODE_ACTION_MESSAGES as text } from "./node-action-messages.ts";

export function useNodeMenuActions(nodeId: string) {
  const dispatch = useDispatch();
  const { flowStore } = useAppStores();
  const duplicate = () => {
    const node = flowStore.getState().state.flow.nodes.find((node) => node.id === nodeId);
    if (node !== undefined)
      dispatch({
        type: "node.add",
        node: {
          ...node,
          id: createUniqueId(
            node.id,
            new Set(flowStore.getState().state.flow.nodes.map((node) => node.id)),
          ),
        },
      });
  };
  return [
    { label: text.duplicate, execute: duplicate },
    {
      label: text.remove,
      execute: () => {
        dispatch({ type: "node.remove", nodeIds: [nodeId] });
      },
    },
  ];
}
