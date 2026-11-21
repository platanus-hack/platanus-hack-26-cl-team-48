import { portIdOf, type FlowNode } from "@nodomics/protocol";
import { useDispatch, useFlowState } from "../app-context.ts";
import type { FlowEdit } from "../flow/flow-edits.ts";
import { createUniqueId } from "../flow/unique-id.ts";
import { exposedParamsOf, type ExposedParam } from "../library/flow-node.ts";
import type { FormField } from "./form-fields.ts";

export function useExposedParam(nodeId: string, field: FormField) {
  const flow = useFlowState((state) => state.flow);
  const dispatch = useDispatch();
  const entries = flow.nodes.filter((node) => node.type === "flow.node");
  const entry = entries.length === 1 ? entries[0] : undefined;
  const node = flow.nodes.find((node) => node.id === nodeId);
  const items = entry === undefined ? [] : exposedParamsOf(entry);
  const exposed = items.find((item) => item.node === nodeId && item.param === field.name);
  return {
    exposed,
    canExpose: canExpose(node, entry),
    toggle: () => {
      if (entry !== undefined) dispatch(exposureEdit({ entry, items, exposed, field, nodeId }));
    },
  };
}

function canExpose(node: FlowNode | undefined, entry: FlowNode | undefined): boolean {
  return (
    entry !== undefined && node !== undefined && !["flow.node", "flow.output"].includes(node.type)
  );
}

function toggleExposure({
  items,
  exposed,
  field,
  nodeId,
}: {
  readonly items: ReadonlyArray<ExposedParam>;
  readonly exposed: ExposedParam | undefined;
  readonly field: FormField;
  readonly nodeId: string;
}): ReadonlyArray<ExposedParam> {
  return exposed === undefined
    ? [
        ...items,
        {
          id: createUniqueId(portIdOf(field.label), new Set(items.map((item) => item.id))),
          title: field.label,
          node: nodeId,
          param: field.name,
        },
      ]
    : items.filter((item) => item !== exposed);
}

function exposureEdit(
  deps: Parameters<typeof toggleExposure>[0] & { readonly entry: FlowNode },
): FlowEdit {
  return {
    type: "param.set",
    nodeId: deps.entry.id,
    param: "params",
    value: toggleExposure(deps),
  };
}
