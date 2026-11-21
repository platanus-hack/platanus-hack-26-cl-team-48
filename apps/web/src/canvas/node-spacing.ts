import type { Position } from "../flow/flow-commands.ts";
import type { Size } from "./canvas-changes.ts";

/** The gap kept between stacked nodes that had to move apart: two dots of the canvas grid. */
export const ROW_SPACING = 32;
/** Between columns the gap also holds the connection and the chip with the size it carries. */
export const COLUMN_SPACING = 96;
/** Nodes closer than one dot of the grid count as touching; wider gaps are the author's choice. */
const TOUCH_MARGIN = 16;

type NodeBox = { readonly id: string; readonly position: Position; readonly size?: Size };
type Placed = { readonly desired: Position; readonly position: Position; readonly size: Size };

/**
 * Where to draw each node so none overlaps another, given the position the flow saved and the
 * size the canvas measured. Nodes keep their place unless they grew into a neighbour (a preview
 * inside a node makes it much bigger); then the later one moves right if the flow put it to the
 * right, or down otherwise. The flow itself is not changed, so shrinking the nodes restores it.
 */
export function spaceOutNodes(
  boxes: ReadonlyArray<NodeBox>,
  pinned: ReadonlySet<string>,
): ReadonlyMap<string, Position> {
  const placed: Placed[] = [];
  const positions = new Map<string, Position>();
  for (const box of placementOrder(boxes, pinned)) {
    const position = pinned.has(box.id) ? box.position : clearOf(box, placed);
    positions.set(box.id, position);
    if (box.size !== undefined) placed.push({ desired: box.position, position, size: box.size });
  }
  return positions;
}

/** Pinned nodes first, then the flow from left to right and top to bottom. */
function placementOrder(boxes: ReadonlyArray<NodeBox>, pinned: ReadonlySet<string>) {
  const byReadingOrder = (a: NodeBox, b: NodeBox) =>
    a.position.x - b.position.x || a.position.y - b.position.y;
  return [
    ...boxes.filter((box) => pinned.has(box.id)),
    ...boxes.filter((box) => !pinned.has(box.id)).sort(byReadingOrder),
  ];
}

/**
 * Each push moves the node past one placed node for good, since positions only grow, so this
 * ends after at most one push per placed node.
 */
function clearOf(box: NodeBox, placed: ReadonlyArray<Placed>): Position {
  if (box.size === undefined) return box.position;
  let position = box.position;
  for (let blocker = findOverlap(position, box.size, placed); blocker !== undefined;) {
    position = pushPast(box.position, position, blocker);
    blocker = findOverlap(position, box.size, placed);
  }
  return position;
}

function pushPast(desired: Position, position: Position, blocker: Placed): Position {
  return desired.x > blocker.desired.x
    ? { x: blocker.position.x + blocker.size.width + COLUMN_SPACING, y: position.y }
    : { x: position.x, y: blocker.position.y + blocker.size.height + ROW_SPACING };
}

const findOverlap = (position: Position, size: Size, placed: ReadonlyArray<Placed>) =>
  placed.find(
    (other) =>
      position.x < other.position.x + other.size.width + TOUCH_MARGIN &&
      other.position.x < position.x + size.width + TOUCH_MARGIN &&
      position.y < other.position.y + other.size.height + TOUCH_MARGIN &&
      other.position.y < position.y + size.height + TOUCH_MARGIN,
  );
