import type { ReactElement } from "react";
import { classNames } from "./class-names.ts";
import { ICON_SIZE } from "./Icon.tsx";
import { MESSAGES } from "./messages.ts";
import type { DataType } from "./types.ts";

const VIEW_BOX_EXTENT = 12;
const INSET_RATIO = 0.1;
const COLUMN_X_RATIO = 0.3;
const COLUMN_WIDTH_RATIO = 0.4;
const HEXAGON_SIDE_RATIO = 0.25;
const CORNER_CUT_RATIO = 0.35;
const EDGE = 0.75;
const CORNER = 1;
const HALF_STROKE = 0.5;
const ECHO_OFFSET = "translate(-2,-2)";

const SHAPES: Record<DataType, (size: number) => ReactElement> = {
  table: (s) => {
    const k = s * INSET_RATIO + HALF_STROKE;
    return <rect x={k} y={k} width={s - 2 * k} height={s - 2 * k} rx={CORNER} />;
  },
  column: (s) => (
    <rect
      x={s * COLUMN_X_RATIO}
      y={EDGE}
      width={s * COLUMN_WIDTH_RATIO}
      height={s - 2 * EDGE}
      rx={CORNER}
    />
  ),
  value: (s) => <circle cx={s / 2} cy={s / 2} r={s / 2 - CORNER} />,
  geo: (s) => (
    <polygon points={points(s / 2, EDGE, s - EDGE, s / 2, s / 2, s - EDGE, EDGE, s / 2)} />
  ),
  image: (s) => (
    <polygon points={points(s / 2, CORNER, s - EDGE, s - 2 * EDGE, EDGE, s - 2 * EDGE)} />
  ),
  model: (s) => {
    const a = s * HEXAGON_SIDE_RATIO;
    return (
      <polygon
        points={points(
          a,
          CORNER,
          s - a,
          CORNER,
          s - EDGE,
          s / 2,
          s - a,
          s - CORNER,
          a,
          s - CORNER,
          EDGE,
          s / 2,
        )}
      />
    );
  },
  chart: (s) => {
    const near = s * INSET_RATIO + HALF_STROKE;
    const cut = s * CORNER_CUT_RATIO;
    return (
      <polygon
        points={points(
          near,
          near,
          s - cut,
          near,
          s - near,
          cut,
          s - near,
          s - near,
          near,
          s - near,
        )}
      />
    );
  },
  any: (s) => <circle cx={s / 2} cy={s / 2} r={s / 2 - 2 * EDGE} />,
};

function points(...coordinates: ReadonlyArray<number>): string {
  return coordinates.join(" ");
}

export const dataTypeLabel = (type: DataType): string => MESSAGES.dataTypes[type];

export type TypeGlyphProps = {
  readonly type: DataType;
  readonly size?: number | string;
  readonly filled?: boolean;
  readonly multi?: boolean;
};

export function TypeGlyph({
  type,
  size = ICON_SIZE.xs,
  filled = true,
  multi = false,
}: TypeGlyphProps) {
  const shape = SHAPES[type](VIEW_BOX_EXTENT);
  return (
    <svg
      className={classNames(
        "nd-glyph",
        `nd-type-${type}`,
        (!filled || type === "any") && "nd-glyph-hollow",
      )}
      width={size}
      height={size}
      viewBox={`0 0 ${String(VIEW_BOX_EXTENT)} ${String(VIEW_BOX_EXTENT)}`}
      role="img"
      aria-label={MESSAGES.dataTypes[type]}
    >
      {multi && (
        <g transform={ECHO_OFFSET} className="nd-glyph-echo">
          {shape}
        </g>
      )}
      {shape}
    </svg>
  );
}
