import { computeEdgeGeometry } from "./edge-geometry.ts";
import { MESSAGES } from "./messages.ts";
import type { DataType, Point } from "./types.ts";

const PADDING = 12;
const LABELLED_PADDING = 24;
const MARK_RADIUS = 8;
const MARK_CROSS = "M-3,-3 L3,3 M3,-3 L-3,3";
const BADGE_HEIGHT = 18;
const BADGE_CORNER = 4;
const COMMENT_BADGE_WIDTH = 22;
const LABEL_CHAR_WIDTH = 6.8;
const LABEL_PADDING = 12;
const LABEL_LIFT = 14;
const TEXT_BASELINE = 4;

type EdgeState = "idle" | "selected" | "flowing" | "stale" | "invalid" | "pending";

export type EdgeProps = {
  readonly from: Point;
  readonly to: Point;
  readonly type?: DataType;
  readonly state?: EdgeState;
  readonly comments?: number;
  readonly label?: string;
  readonly inline?: boolean;
  readonly onSelect?: (() => void) | undefined;
};

export function Edge({
  from,
  to,
  type = "table",
  state = "idle",
  comments,
  label,
  inline = false,
  onSelect,
}: EdgeProps) {
  const { path, box, midpoint } = computeEdgeGeometry(
    from,
    to,
    label === undefined ? PADDING : LABELLED_PADDING,
  );
  const hasComments = comments !== undefined && comments > 0;
  const center = `translate(${String(midpoint.x)},${String(midpoint.y)})`;
  return (
    <svg
      className={`nd-edge nd-edge-${state} nd-type-${type}`}
      viewBox={`${String(box.x)} ${String(box.y)} ${String(box.width)} ${String(box.height)}`}
      role={onSelect === undefined ? "img" : "button"}
      tabIndex={onSelect === undefined ? undefined : 0}
      aria-pressed={onSelect === undefined ? undefined : state === "selected"}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect?.();
        }
      }}
      aria-label={label ?? MESSAGES.edge.connection}
      {...(inline
        ? { width: box.width, height: box.height }
        : {
            style: {
              position: "absolute",
              left: box.x,
              top: box.y,
              width: box.width,
              height: box.height,
              overflow: "visible",
            },
          })}
    >
      <path className="nd-edge-hit" d={path} onClick={onSelect} />
      <path className="nd-edge-line" d={path} />
      {state === "invalid" && (
        <g className="nd-edge-mark" transform={center}>
          <circle r={MARK_RADIUS} />
          <path d={MARK_CROSS} />
        </g>
      )}
      {hasComments && (
        <EdgeBadge
          className="nd-edge-comment"
          transform={center}
          text={String(comments)}
          width={COMMENT_BADGE_WIDTH}
        />
      )}
      {label !== undefined && state !== "invalid" && !hasComments && (
        <EdgeBadge
          className="nd-edge-label"
          transform={`translate(${String(midpoint.x)},${String(midpoint.y - LABEL_LIFT)})`}
          text={label}
          width={label.length * LABEL_CHAR_WIDTH + LABEL_PADDING}
        />
      )}
    </svg>
  );
}

type EdgeBadgeProps = {
  readonly className: string;
  readonly transform: string;
  readonly text: string;
  readonly width: number;
};

function EdgeBadge({ className, transform, text, width }: EdgeBadgeProps) {
  return (
    <g className={className} transform={transform}>
      <rect
        x={-width / 2}
        y={-BADGE_HEIGHT / 2}
        width={width}
        height={BADGE_HEIGHT}
        rx={BADGE_CORNER}
      />
      <text x={0} y={TEXT_BASELINE} textAnchor="middle">
        {text}
      </text>
    </g>
  );
}
