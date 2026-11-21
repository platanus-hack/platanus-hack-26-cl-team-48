import { useNodesInitialized, useStore, type Viewport } from "@xyflow/react";
import { useEffect, useRef } from "react";
import { flowLayoutKey, hasMovedFrom } from "./initial-viewport.ts";
import { useFitFlow } from "./use-fit-flow.ts";

/**
 * Fits the flow when it opens and keeps it fitted while it changes size, as previews arrive in
 * the nodes or the window resizes, until the user pans, zooms or drags a node.
 */
export function InitialViewport({ isDragging }: { readonly isDragging: boolean }) {
  const isInitialized = useNodesInitialized();
  const width = useStore((state) => state.width);
  const height = useStore((state) => state.height);
  const layout = useStore((state) => flowLayoutKey(state.nodes));
  const transform = useStore((state) => state.transform);
  const fitted = useRef<Viewport | undefined>(undefined);
  const hasUserMoved = useRef(false);
  const fitFlow = useFitFlow();
  useEffect(() => {
    if (isDragging || (fitted.current !== undefined && hasMovedFrom(fitted.current, transform)))
      hasUserMoved.current = true;
  }, [isDragging, transform]);
  useEffect(() => {
    if (hasUserMoved.current || !isInitialized || width === 0 || height === 0) return;
    fitted.current = fitFlow();
  }, [isInitialized, width, height, layout, fitFlow]);
  return null;
}
