import { classNames } from "./class-names.ts";
import { glyphPaths, type ThreadGlyphKind } from "./lineage.ts";

export type { ThreadGlyphKind };

export type ThreadGlyphProps = {
  readonly kind: ThreadGlyphKind;
  readonly className?: string | undefined;
};

export function ThreadGlyph({ kind, className }: ThreadGlyphProps) {
  return (
    <svg
      className={classNames("nd-thread-glyph", className)}
      viewBox="0 0 120 40"
      aria-hidden="true"
      fill="none"
    >
      {renderGlyph(kind)}
    </svg>
  );
}

function renderGlyph(kind: ThreadGlyphKind) {
  if (kind === "crosses") {
    return renderCrosses();
  }
  if (kind === "braids") {
    return renderBraids();
  }
  if (kind === "tangles") {
    return renderTangles();
  }
  if (kind === "untangles") {
    return renderUntangles();
  }
  if (kind === "breaks") {
    return renderBreaks();
  }
  return renderSplices();
}

function renderCrosses() {
  const { base, crossing } = glyphPaths.crosses;
  return (
    <>
      <path
        d={base}
        stroke="var(--lineage-origin, var(--ink-faint))"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d={crossing}
        stroke="var(--nd-glyph-halo, var(--brand-paper, var(--surface-100)))"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <path
        d={crossing}
        stroke="var(--lineage-adapt, var(--accent))"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </>
  );
}

function renderBraids() {
  const { base, crossing } = glyphPaths.braids;
  return (
    <>
      <path
        d={base}
        stroke="var(--lineage-origin, var(--ink-faint))"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d={crossing}
        stroke="var(--nd-glyph-halo, var(--brand-paper, var(--surface-100)))"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <path
        d={crossing}
        stroke="var(--lineage-adapt, var(--accent))"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </>
  );
}

function renderTangles() {
  const { base, crossing } = glyphPaths.tangles;
  return (
    <>
      <circle
        cx="62"
        cy="20"
        r="17"
        stroke="var(--lineage-attention, var(--status-warn))"
        strokeWidth="1.4"
        strokeDasharray="3 4"
      />
      <path
        d={base}
        stroke="var(--lineage-origin, var(--ink-faint))"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d={crossing}
        stroke="var(--nd-glyph-halo, var(--brand-paper, var(--surface-100)))"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <path
        d={crossing}
        stroke="var(--lineage-adapt, var(--accent))"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </>
  );
}

function renderUntangles() {
  const { base, crossing } = glyphPaths.untangles;
  return (
    <>
      <path
        d={base}
        stroke="var(--lineage-origin, var(--ink-faint))"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d={crossing}
        stroke="var(--lineage-adapt, var(--accent))"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="98" cy="20" r="4" fill="var(--lineage-knot, var(--ink))" />
    </>
  );
}

function renderBreaks() {
  const { lead, cracks, tail } = glyphPaths.breaks;
  return (
    <>
      <path
        d={lead}
        stroke="var(--lineage-adapt, var(--accent))"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d={cracks}
        stroke="var(--lineage-adapt, var(--accent))"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d={tail}
        stroke="var(--lineage-adapt, var(--accent))"
        strokeWidth="2.4"
        strokeLinecap="round"
        opacity="0.4"
      />
    </>
  );
}

function renderSplices() {
  const { base, ties } = glyphPaths.splices;
  return (
    <>
      <path
        d={base}
        stroke="var(--lineage-adapt, var(--accent))"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      {ties.map((x) => (
        <line
          key={x}
          x1={x}
          y1="13"
          x2={x}
          y2="27"
          stroke="var(--lineage-knot, var(--ink))"
          strokeWidth="1.6"
        />
      ))}
    </>
  );
}
