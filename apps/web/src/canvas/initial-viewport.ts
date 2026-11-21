import { getViewportForBounds, type Rect, type Transform, type Viewport } from "@xyflow/react";

type CanvasSize = { readonly width: number; readonly height: number };
type Side = "top" | "right" | "bottom" | "left";
/** The floating panels over the canvas, by the side of the canvas they cover. */
export type CanvasInsets = Partial<Record<Side, DOMRect>>;

const MIN_INITIAL_ZOOM = 0.5;
const MAX_INITIAL_ZOOM = 1;
const INITIAL_PADDING = 0.08;
/** Below this, a difference comes from rounding, not from the user panning or zooming. */
const VIEWPORT_TOLERANCE = 0.01;

/** Fits the flow inside `visible`, the part of the canvas no floating panel covers. */
export function initialViewport(
  bounds: Rect,
  size: CanvasSize,
  visible: Rect = { x: 0, y: 0, ...size },
) {
  const viewport = getViewportForBounds(
    bounds,
    visible.width,
    visible.height,
    MIN_INITIAL_ZOOM,
    MAX_INITIAL_ZOOM,
    INITIAL_PADDING,
  );
  return { ...viewport, x: viewport.x + visible.x, y: viewport.y + visible.y };
}

/** The rectangle between the panels, relative to the canvas. */
export function visibleArea(canvas: DOMRect, insets: CanvasInsets): Rect {
  const left = (insets.left?.right ?? canvas.left) - canvas.left;
  const top = (insets.top?.bottom ?? canvas.top) - canvas.top;
  const right = (insets.right?.left ?? canvas.right) - canvas.left;
  const bottom = (insets.bottom?.top ?? canvas.bottom) - canvas.top;
  return { x: left, y: top, width: right - left, height: bottom - top };
}

/** Whether the canvas now shows something else than the viewport it fitted, xyflow's [x, y, zoom]. */
export function hasMovedFrom(fitted: Viewport, [x, y, zoom]: Transform): boolean {
  return [fitted.x - x, fitted.y - y, fitted.zoom - zoom].some(
    (difference) => Math.abs(difference) > VIEWPORT_TOLERANCE,
  );
}

type PlacedNode = {
  readonly position: { readonly x: number; readonly y: number };
  readonly measured?: { readonly width?: number; readonly height?: number };
};

/** A key that changes whenever a node moves or changes size, and so the flow's extent may too. */
export const flowLayoutKey = (nodes: ReadonlyArray<PlacedNode>): string =>
  nodes
    .map(({ position, measured }) =>
      [position.x, position.y, measured?.width ?? 0, measured?.height ?? 0].join(","),
    )
    .join(";");
