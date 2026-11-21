import { TypeGlyph, type PortProps } from "@nodomics/ui";
import {
  Handle,
  Position,
  useUpdateNodeInternals,
  type Node as XyNode,
  type NodeProps as XyNodeProps,
} from "@xyflow/react";
import { useEffect } from "react";
import { NodeActionToolbar } from "./NodeActionToolbar.tsx";
import { NodeCard } from "./NodeCard.tsx";
import type { NodeView } from "./node-views.ts";

export type CanvasNodeType = XyNode<{ readonly view: NodeView }, "nodomics">;

const HALF_ROW = 0.5;

/** Port handles line up with the port rows under the node's header, which share its height. */
const handleTop = (index: number) => `calc(var(--node-header) * ${String(index + 1 + HALF_ROW)})`;

export function CanvasNode({ id, data, selected, dragging }: XyNodeProps<CanvasNodeType>) {
  const { view } = data;
  const inputs = view.props.variant === "source" ? [] : (view.props.inputs ?? []);
  useHandleChanges(id, [...view.handles.inputs, "|", ...view.handles.outputs].join(","));
  return (
    <NodeCard view={view} isSelected={selected} isDragging={dragging}>
      {selected && <NodeActionToolbar nodeId={id} />}
      {view.handles.inputs.map((port, index) => (
        <PortHandle key={port} id={port} type="target" index={index} port={inputs[index]} />
      ))}
      {view.handles.outputs.map((port, index) => (
        <PortHandle
          key={port}
          id={port}
          type="source"
          index={index}
          port={view.props.outputs?.[index]}
        />
      ))}
    </NodeCard>
  );
}

/** Ports can come from params (ADR 0016); React Flow must measure the handles again when they change. */
function useHandleChanges(nodeId: string, handles: string) {
  const updateNodeInternals = useUpdateNodeInternals();
  useEffect(() => {
    updateNodeInternals(nodeId);
  }, [nodeId, handles, updateNodeInternals]);
}

function PortHandle(props: {
  readonly id: string;
  readonly type: "source" | "target";
  readonly index: number;
  readonly port: PortProps | undefined;
}) {
  return (
    <Handle
      id={props.id}
      type={props.type}
      position={props.type === "target" ? Position.Left : Position.Right}
      style={{ top: handleTop(props.index) }}
    >
      {props.port !== undefined && (
        <TypeGlyph
          type={props.port.type}
          filled={props.port.connected === true}
          size="var(--port-size)"
        />
      )}
    </Handle>
  );
}
