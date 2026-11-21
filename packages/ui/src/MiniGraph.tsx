const VIEW_BOX = "0 0 200 72";
const CONNECTIONS =
  "M40 20 C70 20 70 36 100 36 M40 52 C70 52 70 36 100 36 M128 36 C150 36 150 36 168 36";
const NODE_BOXES: ReadonlyArray<readonly [number, number]> = [
  [4, 12],
  [4, 44],
  [88, 28],
  [156, 28],
];
const NODE_WIDTH = 36;
const NODE_HEIGHT = 16;
const NODE_CORNER = 3;

/** Placeholder drawing of a flow, used when a Hub flow has no thumbnail of its own. */
export function MiniGraph() {
  return (
    <svg className="nd-minigraph" viewBox={VIEW_BOX} aria-hidden="true">
      <path d={CONNECTIONS} />
      {NODE_BOXES.map(([x, y]) => (
        <rect
          key={`${String(x)}-${String(y)}`}
          x={x}
          y={y}
          width={NODE_WIDTH}
          height={NODE_HEIGHT}
          rx={NODE_CORNER}
        />
      ))}
    </svg>
  );
}
