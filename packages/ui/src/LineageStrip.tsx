import { classNames } from "./class-names.ts";
import { segmentsFor, wave, type LineageEvent, type LineageSegment } from "./lineage.ts";

export type { LineageEvent, LineageSegment };

export type LineageStripProps = {
  readonly events: readonly LineageEvent[];
  readonly className?: string | undefined;
};

const STRIP_WIDTH = 300;
const STRIP_Y = "14";

export function LineageStrip({ events, className }: LineageStripProps) {
  const segments = segmentsFor(events, STRIP_WIDTH);

  return (
    <svg
      className={classNames("nd-lineage", className)}
      viewBox="0 0 300 28"
      preserveAspectRatio="none"
      aria-hidden="true"
      fill="none"
    >
      {segments.map((segment, index) => renderSegment(segment, index))}
    </svg>
  );
}

function renderSegment(segment: LineageSegment, index: number) {
  const { kind, x1, x2 } = segment;
  if (kind === "origin") {
    return (
      <line
        key={index}
        x1={x1}
        y1={STRIP_Y}
        x2={x2}
        y2={STRIP_Y}
        stroke="var(--lineage-origin, var(--ink-faint))"
        strokeWidth="2.2"
      />
    );
  }
  if (kind === "adapt") {
    return (
      <g key={index}>
        <path
          d={wave(x1, x2, true)}
          stroke="var(--lineage-origin, var(--ink-faint))"
          strokeWidth="2"
          fill="none"
        />
        <path
          d={wave(x1, x2, false)}
          stroke="var(--lineage-adapt, var(--accent))"
          strokeWidth="2"
          fill="none"
        />
        <circle cx={x1} cy={STRIP_Y} r="3.5" fill="var(--lineage-knot, var(--ink))" />
      </g>
    );
  }
  if (kind === "agent") {
    return (
      <g key={index}>
        <line
          x1={x1}
          y1={STRIP_Y}
          x2={x2}
          y2={STRIP_Y}
          stroke="var(--lineage-adapt, var(--accent))"
          strokeWidth="2.2"
          strokeDasharray="3 4"
        />
        <circle
          cx={x1}
          cy={STRIP_Y}
          r="3.5"
          fill="var(--brand-paper, var(--surface-100))"
          stroke="var(--lineage-adapt, var(--accent))"
          strokeWidth="1.5"
        />
      </g>
    );
  }
  if (kind === "broken") {
    const mid = (x1 + x2) / 2;
    return (
      <g key={index}>
        <line
          x1={x1}
          y1={STRIP_Y}
          x2={mid - 6}
          y2={STRIP_Y}
          stroke="var(--lineage-adapt, var(--accent))"
          strokeWidth="2.2"
        />
        <line
          x1={mid + 6}
          y1={STRIP_Y}
          x2={x2}
          y2={STRIP_Y}
          stroke="var(--lineage-adapt, var(--accent))"
          strokeWidth="2.2"
          opacity="0.45"
        />
      </g>
    );
  }
  return (
    <g key={index}>
      <line
        x1={x1}
        y1={STRIP_Y}
        x2={x2}
        y2={STRIP_Y}
        stroke="var(--lineage-adapt, var(--accent))"
        strokeWidth="2.2"
      />
      {[0, 4, 8].map((offset) => (
        <line
          key={offset}
          x1={x1 + 4 + offset}
          y1="8"
          x2={x1 + 4 + offset}
          y2="20"
          stroke="var(--lineage-knot, var(--ink))"
          strokeWidth="1.4"
        />
      ))}
    </g>
  );
}
