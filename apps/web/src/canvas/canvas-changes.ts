import type { Connection as CanvasConnection, EdgeChange, NodeChange } from "@xyflow/react";
import type { Command, FlowEdit, Position } from "../flow/flow-commands.ts";
import type { Connection } from "./connect-ports.ts";

export type Size = { readonly width: number; readonly height: number };

export type CanvasState = {
  /** Positions of nodes being dragged: the flow only learns the final one. */
  readonly dragging: ReadonlyMap<string, Position>;
  /** Sizes the canvas measured; it keeps a node hidden until it gets its size back. */
  readonly measured: ReadonlyMap<string, Size>;
  readonly selectedIds: ReadonlyArray<string>;
};

export type NodeChangeOutcome = CanvasState & { readonly commands: ReadonlyArray<Command> };

type SelectableChange = NodeChange | EdgeChange;

/** Translates drags and selections on the canvas into flow commands and canvas-only state. */
export function interpretNodeChanges(
  changes: ReadonlyArray<NodeChange>,
  canvas: CanvasState,
): NodeChangeOutcome {
  const removedIds = changes.flatMap((change) => (change.type === "remove" ? [change.id] : []));
  const ended = endedDrags(changes, canvas.dragging);
  return {
    commands: ended.moves,
    dragging: ended.dragging,
    measured: applyDimensionChanges(changes, canvas.measured, removedIds),
    selectedIds: applySelectChanges(changes, canvas.selectedIds).filter(
      (id) => !removedIds.includes(id),
    ),
  };
}

function applyDimensionChanges(
  changes: ReadonlyArray<NodeChange>,
  measured: ReadonlyMap<string, Size>,
  removedIds: ReadonlyArray<string>,
): ReadonlyMap<string, Size> {
  const sizes = changes.flatMap((change) =>
    change.type === "dimensions" && change.dimensions !== undefined
      ? [[change.id, change.dimensions] as const]
      : [],
  );
  return new Map([...measured, ...sizes].filter(([id]) => !removedIds.includes(id)));
}

export function applySelectChanges(
  changes: ReadonlyArray<SelectableChange>,
  selectedIds: ReadonlyArray<string>,
): ReadonlyArray<string> {
  return changes.reduce<ReadonlyArray<string>>((selection, change) => {
    if (change.type !== "select") return selection;
    const others = selection.filter((id) => id !== change.id);
    return change.selected ? [...others, change.id] : others;
  }, selectedIds);
}

/** Everything the user deleted at once becomes one undoable edit. */
export function interpretDeletion(deleted: {
  readonly nodes: ReadonlyArray<{ readonly id: string }>;
  readonly edges: ReadonlyArray<{ readonly id: string }>;
}): FlowEdit | undefined {
  if (deleted.nodes.length === 0 && deleted.edges.length === 0) return undefined;
  return {
    type: "batch",
    edits: [
      ...(deleted.nodes.length > 0
        ? [{ type: "node.remove", nodeIds: deleted.nodes.map((node) => node.id) } as const]
        : []),
      ...deleted.edges.map((edge) => ({ type: "edge.remove", edgeId: edge.id }) as const),
    ],
  };
}

export function toConnection(connection: CanvasConnection): Connection | undefined {
  const { source, sourceHandle, target, targetHandle } = connection;
  if (sourceHandle === null || targetHandle === null) return undefined;
  return { from: { node: source, port: sourceHandle }, to: { node: target, port: targetHandle } };
}

function endedDrags(
  changes: ReadonlyArray<NodeChange>,
  dragging: ReadonlyMap<string, Position>,
): { readonly moves: ReadonlyArray<Command>; readonly dragging: ReadonlyMap<string, Position> } {
  return changes.reduce<{ moves: Command[]; dragging: Map<string, Position> }>(
    (outcome, change) => {
      if (change.type !== "position") return outcome;
      const position = change.position ?? outcome.dragging.get(change.id);
      if (change.dragging === true && position !== undefined)
        return { ...outcome, dragging: new Map(outcome.dragging).set(change.id, position) };
      const rest = new Map(outcome.dragging);
      rest.delete(change.id);
      return {
        moves:
          position === undefined
            ? outcome.moves
            : [...outcome.moves, { type: "node.move", nodeId: change.id, position }],
        dragging: rest,
      };
    },
    { moves: [], dragging: new Map(dragging) },
  );
}
