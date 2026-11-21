import { useReactFlow, useStore, type Viewport } from "@xyflow/react";
import { useCallback } from "react";
import { initialViewport, visibleArea, type CanvasInsets } from "./initial-viewport.ts";

const SIDES = ["top", "right", "bottom", "left"] as const;

/**
 * Fits the whole flow in the part of the canvas that the floating panels leave visible, and
 * returns the viewport it set.
 */
export function useFitFlow() {
  const { getNodes, getNodesBounds, setViewport } = useReactFlow();
  const canvas = useStore((state) => state.domNode);
  return useCallback((): Viewport | undefined => {
    if (canvas === null) return undefined;
    const bounds = canvas.getBoundingClientRect();
    const viewport = initialViewport(
      getNodesBounds(getNodes()),
      bounds,
      visibleArea(bounds, readInsets(canvas.ownerDocument)),
    );
    void setViewport(viewport);
    return viewport;
  }, [canvas, getNodes, getNodesBounds, setViewport]);
}

/** Panels mark the side they cover with `data-canvas-inset`; hidden panels cover nothing. */
function readInsets(document: Document): CanvasInsets {
  return Object.fromEntries(
    SIDES.flatMap((side) => {
      const rect = document.querySelector(`[data-canvas-inset="${side}"]`)?.getBoundingClientRect();
      return rect === undefined || rect.width === 0 ? [] : [[side, rect]];
    }),
  );
}
