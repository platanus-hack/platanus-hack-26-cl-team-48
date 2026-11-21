import { Button } from "@nodomics/ui";
import { useReactFlow, useViewport } from "@xyflow/react";
import { useFitFlow } from "../canvas/use-fit-flow.ts";
import { LAYOUT_MESSAGES as M } from "./messages.ts";

const PERCENT = 100;

export function CanvasZoom() {
  const { zoomIn, zoomOut } = useReactFlow();
  const { zoom } = useViewport();
  const fitFlow = useFitFlow();
  return (
    <div className="web-floating web-canvas-zoom" role="group" aria-label={M.zoom}>
      <Button
        variant="ghost"
        icon="minus"
        label={M.zoomOut}
        onClick={() => {
          void zoomOut();
        }}
      ></Button>
      <span className="web-canvas-zoom-level">{Math.round(zoom * PERCENT)} %</span>
      <Button
        variant="ghost"
        icon="plus"
        label={M.zoomIn}
        onClick={() => {
          void zoomIn();
        }}
      ></Button>
      <span className="web-divider" aria-hidden="true" />
      <Button variant="ghost" icon="maximize" label={M.fitView} onClick={fitFlow}></Button>
    </div>
  );
}
