import { Button } from "@nodomics/ui";
import { useId, useRef, type ReactNode } from "react";
import { ResizeHandle } from "./ResizeHandle.tsx";
import { LAYOUT_MESSAGES as M } from "./messages.ts";
import { changePreviewSize, PREVIEW_HEIGHT_RANGE, type PreviewSize } from "./preview-size.ts";
type PreviewFrameProps = {
  readonly size: PreviewSize;
  readonly onChange: (size: PreviewSize) => void;
  /** Receives the frame's actions so the panel can place them in its own header. */
  readonly children: (actions: ReactNode) => ReactNode;
};
/** The floating panel at the bottom of the canvas: resizable from its top edge, or maximized. */
export function PreviewFrame({ size, onChange, children }: PreviewFrameProps) {
  const contentId = useId();
  const frame = useRef<HTMLDivElement>(null);
  const isMaximized = size.mode === "maximized";
  const actions = (
    <Button
      variant="ghost"
      icon={isMaximized ? "minimize-2" : "maximize-2"}
      label={isMaximized ? M.restorePreview : M.maximizePreview}
      onClick={() => {
        onChange(changePreviewSize(size, { type: isMaximized ? "restore" : "maximize" }));
      }}
    ></Button>
  );
  return (
    <div
      ref={frame}
      id={contentId}
      className="web-preview-frame"
      data-mode={size.mode}
      data-canvas-inset="bottom"
    >
      {!isMaximized && (
        <ResizeHandle
          edge="top"
          label={M.resizePreview}
          controls={contentId}
          range={PREVIEW_HEIGHT_RANGE}
          value={size.height}
          valueText={M.percent(size.height)}
          unitsPerPixel={() => percentPerPixel(frame.current?.closest(".web-app"))}
          onResize={(height) => {
            onChange(changePreviewSize(size, { type: "resize", height }));
          }}
          className="web-resize-handle"
        />
      )}
      {children(actions)}
    </div>
  );
}

const percentPerPixel = (workspace: Element | null | undefined) => {
  const height = workspace?.getBoundingClientRect().height ?? 0;
  return height > 0 ? 100 / height : 0;
};
