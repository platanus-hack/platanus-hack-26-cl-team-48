import { Button, Icon } from "@nodomics/ui";
import { useId } from "react";
import { IconMenu } from "../layout/IconMenu.tsx";
import { usePreviewLocation } from "../layout/preview-location.ts";
import { useRunFlow } from "../engine/use-engine-actions.ts";
import { useIsResourceNode } from "./resource-nodes.ts";
import { useNodeMenuActions } from "./use-node-menu-actions.ts";
import { NODE_ACTION_MESSAGES as text } from "./node-action-messages.ts";
import "./canvas.css";

export function NodeActionToolbar({ nodeId }: { readonly nodeId: string }) {
  const { openInPanel } = usePreviewLocation();
  const description = useId();
  const run = useRunFlow();
  const isResource = useIsResourceNode(nodeId);
  return (
    <div
      className="web-node-actions nodrag nopan"
      role="toolbar"
      aria-label={text.label}
      onClick={(event) => {
        event.stopPropagation();
      }}
    >
      {!isResource && (
        <Button
          variant="ghost"
          size="sm"
          icon="play"
          label={text.run}
          disabled={run === undefined}
          onClick={() => {
            void run?.([nodeId]);
          }}
        />
      )}
      <Button
        variant="ghost"
        size="sm"
        icon="eye"
        label={text.view}
        onClick={() => {
          openInPanel(nodeId);
        }}
      />
      <button
        className="nd-btn nd-btn-ghost nd-btn-sm nd-btn-icon"
        disabled
        aria-label={text.disable}
        aria-describedby={`${description}-disable`}
      >
        <Icon name="ban" />
      </button>
      <span id={`${description}-disable`} hidden>
        {text.disableUnavailable}
      </span>
      <MoreActions nodeId={nodeId} />
    </div>
  );
}

function MoreActions({ nodeId }: { readonly nodeId: string }) {
  const actions = useNodeMenuActions(nodeId);
  return (
    <IconMenu
      label={text.more}
      icon="ellipsis"
      items={actions.map((action) => ({
        label: action.label,
        onSelect: action.execute,
      }))}
    />
  );
}
