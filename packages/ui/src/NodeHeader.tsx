import { formatNumber } from "./format-number.ts";
import { ICON_SIZE, Icon } from "./Icon.tsx";
import type { IconName } from "./icons.ts";
import { MESSAGES } from "./messages.ts";
import type { NodeProps, NodeVariant } from "./node-props.ts";
import { StatusIndicator } from "./StatusIndicator.tsx";

const VARIANT_ICONS: Record<NodeVariant, IconName> = {
  source: "database",
  transform: "filter",
  combine: "merge",
  code: "code",
  view: "chart-column",
  subflow: "boxes",
  io: "arrow-right-left",
};

export function NodeHeader({
  variant = "transform",
  zoom = "near",
  state = "idle",
  title,
  originalTitle,
  icon,
  language,
  innerCount = 0,
  progress,
}: NodeProps) {
  const isFar = zoom === "far";
  return (
    <div className="nd-node-head">
      <span className="nd-node-ico">
        <Icon name={icon ?? VARIANT_ICONS[variant]} size={isFar ? ICON_SIZE.lg : ICON_SIZE.md} />
      </span>
      {!isFar && (
        <div className="nd-node-titles">
          <span className="nd-node-title">{title}</span>
          {originalTitle !== undefined && zoom === "near" && (
            <span className="nd-node-orig">{originalTitle}</span>
          )}
        </div>
      )}
      {variant === "subflow" && !isFar && (
        <span className="nd-node-sub" title={MESSAGES.node.containsFlow}>
          <Icon name="boxes" size={ICON_SIZE.xs} />
          {formatNumber(innerCount)}
        </span>
      )}
      {variant === "code" && language !== undefined && !isFar && (
        <span className="nd-node-lang">{language}</span>
      )}
      <StatusIndicator state={state} compact progress={progress} />
    </div>
  );
}
