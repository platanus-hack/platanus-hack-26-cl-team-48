import {
  EngineBadge,
  formatNumber,
  ICON_SIZE,
  Icon,
  Port,
  StatusIndicator,
  statusLabel,
  type NodeProps,
} from "@nodomics/ui";
import type { ReactNode } from "react";
import { useAppStores } from "../app-context.ts";
import { usePreviewLocation } from "../layout/preview-location.ts";
import { MESSAGES } from "../messages.ts";
import { InNodePreview } from "../preview/InNodePreview.tsx";
import type { NodeView } from "./node-views.ts";

type NodeCardProps = {
  readonly view: NodeView;
  readonly isSelected: boolean;
  readonly isDragging: boolean;
  /** The port handles, placed by the canvas. */
  readonly children?: ReactNode;
};

/** A node of the flow as the canvas draws it; its preview follows the chosen location. */
export function NodeCard({ view, isSelected, isDragging, children }: NodeCardProps) {
  const { location } = usePreviewLocation();
  const { props } = view;
  return (
    <div
      className="web-node"
      data-location={location}
      data-selected={isSelected}
      data-dragging={isDragging}
      role="group"
      tabIndex={0}
      aria-label={`${props.title}, ${statusLabel(props.state ?? "idle")}`}
    >
      {children}
      <NodeHead {...props} />
      <NodePorts {...props} />
      <NodeNote {...props} />
      {location === "nodes" ? (
        <InNodePreview nodeId={view.id} />
      ) : (
        <NodeFooter nodeId={view.id} props={props} />
      )}
    </div>
  );
}

function NodeHead({ title, icon, state = "idle", progress, engine }: NodeProps) {
  return (
    <div className="web-node-head">
      <span className="web-node-icon">
        {icon !== undefined && <Icon name={icon} size={ICON_SIZE.sm} />}
      </span>
      <span className="web-node-title">{title}</span>
      {engine !== undefined && <EngineBadge engine={engine} compact />}
      <StatusIndicator state={state} progress={progress} />
    </div>
  );
}

function NodePorts({ variant, inputs = [], outputs = [] }: NodeProps) {
  const shownInputs = variant === "source" ? [] : inputs;
  const rowCount = Math.max(shownInputs.length, outputs.length);
  return Array.from({ length: rowCount }, (_, index) => {
    const input = shownInputs[index];
    const output = outputs[index];
    return (
      // Port rows pair the n-th input with the n-th output; the position is the identity.
      <div key={index} className="web-node-ports">
        {input === undefined ? <span /> : <Port {...input} direction="in" />}
        {output === undefined ? <span /> : <Port {...output} direction="out" />}
      </div>
    );
  });
}

/** Why a node cannot run: the engine's error or the parameters it is missing. */
function NodeNote({ state, errorMessage, summary }: NodeProps) {
  const note = state === "error" ? errorMessage : summary;
  if (note === undefined) return null;
  return (
    <p className="web-node-note" data-tone={state === "error" ? "error" : "warn"}>
      <Icon name={state === "error" ? "circle-alert" : "square-dashed"} size={ICON_SIZE.sm} />
      {note}
    </p>
  );
}

function NodeFooter({ nodeId, props }: { readonly nodeId: string; readonly props: NodeProps }) {
  const { selectionStore } = useAppStores();
  const isView = props.variant === "view";
  if (props.rows === undefined && !isView) return null;
  return (
    <div className="web-node-footer">
      <span className="web-mono">
        {props.rows !== undefined &&
          MESSAGES.preview.dimensions(formatNumber(props.rows), formatNumber(props.cols ?? 0))}
      </span>
      <button
        type="button"
        className="nd-btn nd-btn-ghost nd-btn-sm web-link nodrag"
        onClick={() => {
          selectionStore.getState().select([nodeId]);
        }}
      >
        <Icon name={isView ? "chart-column" : "table"} size={ICON_SIZE.sm} />
        {isView ? MESSAGES.preview.viewChart : MESSAGES.preview.viewData}
      </button>
    </div>
  );
}
