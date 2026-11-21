import { useRef } from "react";
import { clampToRange, type SizeRange } from "./size-range.ts";

/** The edge of the resized content the handle sits on; dragging it away from the content grows it. */
export type ResizeEdge = "top" | "bottom" | "left" | "right";

type Axis = "x" | "y";

const EDGES: Readonly<Record<ResizeEdge, { readonly axis: Axis; readonly growth: 1 | -1 }>> = {
  top: { axis: "y", growth: -1 },
  bottom: { axis: "y", growth: 1 },
  left: { axis: "x", growth: -1 },
  right: { axis: "x", growth: 1 },
};

const KEY_MOVES: Readonly<Record<string, { readonly axis: Axis; readonly delta: 1 | -1 }>> = {
  ArrowUp: { axis: "y", delta: -1 },
  ArrowDown: { axis: "y", delta: 1 },
  ArrowLeft: { axis: "x", delta: -1 },
  ArrowRight: { axis: "x", delta: 1 },
};

type ResizeHandleProps = {
  readonly edge: ResizeEdge;
  readonly label: string;
  /** The id of the resized content. */
  readonly controls: string;
  readonly range: SizeRange;
  readonly value: number;
  readonly valueText: string;
  /** How much the value changes per pixel dragged; zero or less when it cannot be measured. */
  readonly unitsPerPixel: () => number;
  readonly onResize: (value: number) => void;
  readonly className?: string;
};

type Drag = {
  readonly pointerId: number;
  readonly start: number;
  readonly value: number;
  readonly unitsPerPixel: number;
};

/** A separator that resizes content by dragging it or with the arrow keys along its axis. */
export function ResizeHandle(props: ResizeHandleProps) {
  const { edge, range, value, onResize } = props;
  const { axis, growth } = EDGES[edge];
  const drag = useRef<Drag | undefined>(undefined);
  const coordinate = (event: { clientX: number; clientY: number }) =>
    axis === "x" ? event.clientX : event.clientY;
  const resize = (next: number) => {
    onResize(clampToRange(range, next));
  };
  return (
    <div
      role="separator"
      tabIndex={0}
      aria-label={props.label}
      aria-orientation={axis === "y" ? "horizontal" : "vertical"}
      aria-controls={props.controls}
      aria-valuemin={range.min}
      aria-valuemax={range.max}
      aria-valuenow={value}
      aria-valuetext={props.valueText}
      className={props.className}
      data-edge={edge}
      onKeyDown={(event) => {
        const move = KEY_MOVES[event.key];
        if (move?.axis !== axis) return;
        event.preventDefault();
        resize(value + move.delta * growth * range.step);
      }}
      onPointerDown={(event) => {
        const unitsPerPixel = props.unitsPerPixel();
        if (unitsPerPixel <= 0 || event.button !== 0) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = {
          pointerId: event.pointerId,
          start: coordinate(event),
          value,
          unitsPerPixel,
        };
      }}
      onPointerMove={(event) => {
        const current = drag.current;
        if (current?.pointerId !== event.pointerId) return;
        resize(
          current.value + (coordinate(event) - current.start) * growth * current.unitsPerPixel,
        );
      }}
      onPointerUp={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId))
          event.currentTarget.releasePointerCapture(event.pointerId);
        drag.current = undefined;
      }}
      onPointerCancel={() => {
        drag.current = undefined;
      }}
      onLostPointerCapture={() => {
        drag.current = undefined;
      }}
    />
  );
}
