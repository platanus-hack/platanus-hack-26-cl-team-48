import { useReactFlow, useStore, type Viewport } from "@xyflow/react";
import { useCallback } from "react";
import { canvasInsets } from "./canvas-insets.ts";
import { initialViewport, visibleArea } from "./initial-viewport.ts";

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
      visibleArea(bounds, canvasInsets(canvas)),
    );
    void setViewport(viewport);
    return viewport;
  }, [canvas, getNodes, getNodesBounds, setViewport]);
}
