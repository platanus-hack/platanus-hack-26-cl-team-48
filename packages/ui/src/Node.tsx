import { classNames } from "./class-names.ts";
import { ICON_SIZE, Icon } from "./Icon.tsx";
import { MESSAGES } from "./messages.ts";
import { NodeActions } from "./NodeActions.tsx";
import { NodeHeader } from "./NodeHeader.tsx";
import { NodeMeta } from "./NodeMeta.tsx";
import type { NodeProps } from "./node-props.ts";
import { Port } from "./Port.tsx";

export type { NodeAction, NodeProps } from "./node-props.ts";

const PERCENT = 100;
const DEFAULT_COLLABORATOR_COLOR = 1;

export function Node(props: NodeProps) {
  const { zoom = "near", state = "idle", selected = false, showActions = true } = props;
  const collaborator = props.collaborator;
  return (
    <div
      className={classNames(
        "nd-node-wrap",
        collaborator && `nd-collab-${String(collaborator.color ?? DEFAULT_COLLABORATOR_COLOR)}`,
      )}
      style={props.width === undefined ? undefined : { width: props.width }}
    >
      {selected && zoom !== "far" && showActions && <NodeActions {...props} />}
      {props.pending === true && (
        <span className="nd-node-pending-tag">
          <Icon name="sparkles" size={ICON_SIZE.xs} />
          {MESSAGES.node.proposed}
        </span>
      )}
      {collaborator !== undefined && (
        <span className="nd-node-collab-tag">{collaborator.name}</span>
      )}
      <div
        className={nodeClassName(props)}
        tabIndex={0}
        role="group"
        aria-label={`${props.title}, ${MESSAGES.execStates[state]}`}
      >
        <NodeHeader {...props} />
        {state === "running" && props.progress !== undefined && (
          <NodeProgress progress={props.progress} />
        )}
        {zoom !== "far" && <NodeDetails {...props} />}
      </div>
    </div>
  );
}

function nodeClassName({
  variant = "transform",
  zoom = "near",
  state = "idle",
  conditions = [],
  selected,
  dragging,
  pending,
  collaborator,
}: NodeProps): string {
  return classNames(
    "nd-node",
    `nd-node-${variant}`,
    `nd-node-z-${zoom}`,
    `nd-node-s-${state}`,
    selected === true && "nd-node-selected",
    dragging === true && "nd-node-dragging",
    conditions.includes("disabled") && "nd-node-disabled",
    pending === true && "nd-node-pending",
    collaborator !== undefined && "nd-node-collab",
  );
}

function NodeProgress({ progress }: { readonly progress: number }) {
  const percent = Math.round(progress * PERCENT);
  return (
    <div
      className="nd-node-progress"
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={PERCENT}
    >
      <span style={{ width: `${String(percent)}%` }} />
    </div>
  );
}

function NodeDetails(props: NodeProps) {
  const { variant, zoom, state, origin, sourceIcon, thumbnail, summary, errorMessage } = props;
  const isNear = zoom === undefined || zoom === "near";
  return (
    <>
      {variant === "source" && origin !== undefined && (
        <div className="nd-node-origin">
          <Icon name={sourceIcon ?? "file-spreadsheet"} size={ICON_SIZE.sm} />
          <span>{origin}</span>
        </div>
      )}
      <NodePorts {...props} />
      {isNear && thumbnail !== undefined && <div className="nd-node-thumb">{thumbnail}</div>}
      {isNear && summary !== undefined && <div className="nd-node-summary">{summary}</div>}
      {isNear && state === "error" && errorMessage !== undefined && (
        <div className="nd-node-error">
          <Icon name="circle-alert" size={ICON_SIZE.sm} />
          <span>{errorMessage}</span>
        </div>
      )}
      <NodeMeta {...props} />
    </>
  );
}

function NodePorts({ variant, inputs = [], outputs = [] }: NodeProps) {
  const shownInputs = variant === "source" ? [] : inputs;
  const rowCount = Math.max(shownInputs.length, outputs.length);
  if (rowCount === 0) return null;
  return (
    <div className="nd-node-ports">
      {Array.from({ length: rowCount }, (_, index) => {
        const input = shownInputs[index];
        const output = outputs[index];
        return (
          // Port rows pair the n-th input with the n-th output; the position is the identity.
          <div key={index} className="nd-node-portrow">
            {input === undefined ? <span /> : <Port {...input} direction="in" />}
            {output === undefined ? <span /> : <Port {...output} direction="out" />}
          </div>
        );
      })}
    </div>
  );
}
