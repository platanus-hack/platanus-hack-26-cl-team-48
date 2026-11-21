import { EngineBadge } from "./EngineBadge.tsx";
import { formatNumber } from "./format-number.ts";
import { ICON_SIZE, Icon } from "./Icon.tsx";
import { MESSAGES } from "./messages.ts";
import type { NodeOrigin, NodeProps, NodeZoom } from "./node-props.ts";
import { StatusIndicator } from "./StatusIndicator.tsx";
import { TrustBadge } from "./TrustBadge.tsx";
import type { TrustLevel } from "./types.ts";

const ORIGIN_TRUST: Record<NodeOrigin, TrustLevel> = {
  hub: "community",
  verified: "verified",
  org: "org",
  official: "official",
};
const VISIBLE_CONDITIONS: Record<NodeZoom, number> = { far: 0, mid: 1, near: 2 };

export function NodeMeta({
  zoom = "near",
  rows,
  cols = 0,
  conditions = [],
  comments,
  engine,
  from,
}: NodeProps) {
  const shown = conditions.slice(0, VISIBLE_CONDITIONS[zoom]);
  const hidden = conditions.slice(shown.length);
  return (
    <div className="nd-node-meta">
      <span className="nd-node-dims">
        {rows !== undefined &&
          zoom === "near" &&
          MESSAGES.node.dimensions(formatNumber(rows), formatNumber(cols))}
      </span>
      <span className="nd-node-flags">
        {shown.map((condition) => (
          <StatusIndicator key={condition} state={condition} compact />
        ))}
        {hidden.length > 0 && (
          <span
            className="nd-node-more"
            title={hidden.map((condition) => MESSAGES.conditions[condition]).join(", ")}
          >
            {`+${String(hidden.length)}`}
          </span>
        )}
        {comments !== undefined && comments > 0 && (
          <span className="nd-node-comments" title={MESSAGES.node.comments(formatNumber(comments))}>
            <Icon name="message-square" size={ICON_SIZE.xs} />
            {formatNumber(comments)}
          </span>
        )}
        {engine !== undefined && <EngineBadge engine={engine} compact />}
        {from !== undefined && <TrustBadge level={ORIGIN_TRUST[from]} compact />}
      </span>
    </div>
  );
}
