import type { DataType } from "@nodomics/protocol";
import { Edge, formatNumber, TypeGlyph } from "@nodomics/ui";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type Edge as XyEdge,
  type EdgeProps as XyEdgeProps,
} from "@xyflow/react";

import { MESSAGES } from "../messages.ts";

type EdgeData = {
  readonly type: DataType;
  readonly rows?: number | undefined;
  readonly columns?: number | undefined;
};

export type CanvasEdgeType = XyEdge<EdgeData, "nodomics">;

/** Draws the design system's Edge; an invisible xyflow path keeps it selectable and deletable. */
export function CanvasEdge(props: XyEdgeProps<CanvasEdgeType>) {
  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition } = props;
  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });
  return (
    <>
      <BaseEdge id={props.id} path={path} className="web-edge-hitpath" />
      <EdgeLabelRenderer>
        <div className="web-edge-layer">
          <Edge
            from={{ x: sourceX, y: sourceY }}
            to={{ x: targetX, y: targetY }}
            type={props.data?.type ?? "any"}
            state={props.selected === true ? "selected" : "idle"}
          />
        </div>
        {props.data !== undefined && (
          <CarriedSize data={props.data} position={{ x: labelX, y: labelY }} />
        )}
      </EdgeLabelRenderer>
    </>
  );
}

/** "200 × 5": how big the table flowing through the connection is, once it ran. */
function CarriedSize({
  data,
  position,
}: {
  readonly data: EdgeData;
  readonly position: { readonly x: number; readonly y: number };
}) {
  if (data.rows === undefined || data.columns === undefined) return null;
  const rows = formatNumber(data.rows);
  const columns = formatNumber(data.columns);
  return (
    <span
      className="web-edge-size"
      title={MESSAGES.edges.table(rows, columns)}
      style={{
        transform: `translate(-50%, -50%) translate(${String(position.x)}px, ${String(position.y)}px)`,
      }}
    >
      <TypeGlyph type={data.type} size="calc(var(--port-size) - var(--space-1))" />
      {MESSAGES.edges.dimensions(rows, columns)}
    </span>
  );
}
