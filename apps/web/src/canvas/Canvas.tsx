import { Background, ReactFlow, type NodeChange } from "@xyflow/react";
import { useMemo, useState, type DragEvent } from "react";
import {
  useAppStores,
  useCatalog,
  useDispatch,
  useEngineState,
  useFlowState,
  useSelectedIds,
} from "../app-context.ts";
import type { Position } from "../flow/flow-commands.ts";
import { MESSAGES } from "../messages.ts";
import {
  applySelectChanges,
  interpretDeletion,
  type CanvasState,
  type Size,
  interpretNodeChanges,
  toConnection,
} from "./canvas-changes.ts";
import { CanvasEdge, type CanvasEdgeType } from "./CanvasEdge.tsx";
import { CanvasNode, type CanvasNodeType } from "./CanvasNode.tsx";
import { connectPorts } from "./connect-ports.ts";
import { toEdgeViews, toNodeViews, type EdgeView, type NodeView } from "./node-views.ts";
import { InitialViewport } from "./InitialViewport.tsx";
import { spaceOutNodes } from "./node-spacing.ts";
import { useCanvasDrop } from "./use-canvas-drop.ts";

const NODE_TYPES = { nodomics: CanvasNode };
const EDGE_TYPES = { nodomics: CanvasEdge };
const DELETE_KEYS = ["Backspace", "Delete"];
/** The dot grid of the design: one dot every 16 px at natural size. */
const BACKGROUND_GAP = 16;
const NOT_DRAGGING: ReadonlyMap<string, Position> = new Map();
const NOT_MEASURED: ReadonlyMap<string, Size> = new Map();

/** The flow on an xyflow canvas. Every edit goes back to the flow store as a command. */
export function Canvas() {
  const [dragging, setDragging] = useState(NOT_DRAGGING);
  const [measured, setMeasured] = useState(NOT_MEASURED);
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<ReadonlyArray<string>>([]);
  const local = {
    dragging,
    setDragging,
    measured,
    setMeasured,
    selectedEdgeIds,
    setSelectedEdgeIds,
  };
  const { nodes, edges } = useCanvasElements(local);
  const handlers = useCanvasHandlers(local);
  const drop = useCanvasDrop();
  return (
    <div
      className="web-canvas"
      role="region"
      aria-label={MESSAGES.canvas.label}
      onDragOver={allowDrop}
      onDrop={drop}
    >
      <ReactFlow
        proOptions={{ hideAttribution: true }}
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        deleteKeyCode={DELETE_KEYS}
        {...handlers}
      >
        <InitialViewport isDragging={dragging.size > 0} />
        <Background gap={BACKGROUND_GAP} />
      </ReactFlow>
      {nodes.length === 0 && <p className="web-canvas-hint">{MESSAGES.canvas.emptyHint}</p>}
    </div>
  );
}

/** State that only the canvas cares about: live drag positions, sizes and selected connections. */
type CanvasLocalState = {
  readonly dragging: ReadonlyMap<string, Position>;
  readonly setDragging: (dragging: ReadonlyMap<string, Position>) => void;
  readonly measured: ReadonlyMap<string, Size>;
  readonly setMeasured: (measured: ReadonlyMap<string, Size>) => void;
  readonly selectedEdgeIds: ReadonlyArray<string>;
  readonly setSelectedEdgeIds: (ids: ReadonlyArray<string>) => void;
};

function useCanvasElements({ dragging, measured, selectedEdgeIds }: CanvasLocalState) {
  const flow = useFlowState((state) => state.flow);
  const catalog = useCatalog();
  const engine = useEngineState((state) => state);
  const selectedIds = useSelectedIds();
  return {
    nodes: useMemo(
      () =>
        toCanvasNodes(toNodeViews({ flow, catalog, engine }), {
          selectedIds,
          dragging,
          measured,
        }),
      [flow, catalog, engine, selectedIds, dragging, measured],
    ),
    edges: useMemo(
      () => toCanvasEdges(toEdgeViews({ flow, catalog, engine }), selectedEdgeIds),
      [flow, catalog, engine, selectedEdgeIds],
    ),
  };
}

function useCanvasHandlers(local: CanvasLocalState) {
  const { flowStore, selectionStore } = useAppStores();
  const dispatch = useDispatch();
  const catalog = useCatalog();
  const connectionEdit = (connection: Parameters<typeof toConnection>[0]) => {
    const ports = toConnection(connection);
    return ports && connectPorts(flowStore.getState().state.flow, catalog, ports);
  };
  return {
    onNodesChange: (changes: NodeChange<CanvasNodeType>[]) => {
      const outcome = interpretNodeChanges(changes, {
        dragging: local.dragging,
        measured: local.measured,
        selectedIds: selectionStore.getState().selectedIds,
      });
      outcome.commands.forEach(dispatch);
      local.setDragging(outcome.dragging);
      local.setMeasured(outcome.measured);
      selectionStore.getState().select(outcome.selectedIds);
    },
    onEdgesChange: (changes: Parameters<typeof applySelectChanges>[0]) => {
      local.setSelectedEdgeIds(applySelectChanges(changes, local.selectedEdgeIds));
    },
    onDelete: (deleted: Parameters<typeof interpretDeletion>[0]) => {
      const edit = interpretDeletion(deleted);
      if (edit !== undefined) dispatch(edit);
    },
    onConnect: (connection: Parameters<typeof toConnection>[0]) => {
      const edit = connectionEdit(connection);
      if (edit !== undefined) dispatch(edit);
    },
    isValidConnection: (connection: Parameters<typeof toConnection>[0] | CanvasEdgeType) =>
      "sourceHandle" in connection &&
      connectionEdit({
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle ?? null,
        targetHandle: connection.targetHandle ?? null,
      }) !== undefined,
  };
}

const allowDrop = (event: DragEvent) => {
  event.preventDefault();
};

function toCanvasNodes(
  views: ReadonlyArray<NodeView>,
  { selectedIds, dragging, measured }: CanvasState,
): CanvasNodeType[] {
  const positions = drawnPositions(views, { dragging, measured });
  return views.map((view) => ({
    id: view.id,
    type: "nodomics",
    position: positions.get(view.id) ?? view.position,
    measured: measured.get(view.id) ?? {},
    data: { view },
    selected: selectedIds.includes(view.id),
  }));
}

/** Saved or dragged positions, moved apart where nodes grew into each other. */
function drawnPositions(
  views: ReadonlyArray<NodeView>,
  { dragging, measured }: Pick<CanvasState, "dragging" | "measured">,
) {
  return spaceOutNodes(
    views.map((view) => {
      const size = measured.get(view.id);
      return {
        id: view.id,
        position: dragging.get(view.id) ?? view.position,
        ...(size === undefined ? {} : { size }),
      };
    }),
    new Set(dragging.keys()),
  );
}

function toCanvasEdges(
  views: ReadonlyArray<EdgeView>,
  selectedIds: ReadonlyArray<string>,
): CanvasEdgeType[] {
  return views.map(({ type, rows, columns, ...view }) => ({
    ...view,
    type: "nodomics",
    data: { type, rows, columns },
    selected: selectedIds.includes(view.id),
  }));
}
