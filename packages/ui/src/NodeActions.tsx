import { Button } from "./Button.tsx";
import { MESSAGES } from "./messages.ts";
import type { NodeAction, NodeProps } from "./node-props.ts";

export function NodeActions({ conditions = [], onAction }: NodeProps) {
  const text = MESSAGES.node;
  const action = (name: NodeAction) => () => onAction?.(name);
  return (
    <div className="nd-node-actions" role="toolbar" aria-label={text.actions}>
      <Button
        variant="ghost"
        size="sm"
        icon="play"
        label={text.runToHere}
        onClick={action("run")}
      />
      <Button
        variant="ghost"
        size="sm"
        icon="eye"
        label={text.viewData}
        onClick={action("view-data")}
      />
      <Button
        variant="ghost"
        size="sm"
        icon="circle-off"
        label={conditions.includes("disabled") ? text.enable : text.disable}
        onClick={action("toggle-disabled")}
      />
      <Button
        variant="ghost"
        size="sm"
        icon="ellipsis"
        label={text.moreOptions}
        onClick={action("more")}
      />
    </div>
  );
}
