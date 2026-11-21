import { FLOW_FORMAT, type Flow } from "@nodomics/protocol";
import type { SourceTarget } from "../library/source-reconnection.ts";
import { applyEdit, invertEdit, type FlowEdit } from "./flow-edits.ts";

export type { FlowEdit, Position } from "./flow-edits.ts";

/** Every way the flow being edited can change. Components only dispatch these. */
export type Command =
  | FlowEdit
  | {
      readonly type: "sources.rebind";
      readonly targets: ReadonlyArray<SourceTarget & { readonly previousSourceId: string }>;
    }
  | { readonly type: "history.undo" }
  | { readonly type: "history.redo" }
  | { readonly type: "flow.load"; readonly flow: Flow };

type HistoryEntry = { readonly edit: FlowEdit; readonly inverse: FlowEdit };

export type FlowState = {
  readonly flow: Flow;
  /** Grows with every change of the flow, so the engine can tell old events from new ones. */
  readonly rev: number;
  readonly undo: ReadonlyArray<HistoryEntry>;
  readonly redo: ReadonlyArray<HistoryEntry>;
};

export const createFlowState = (
  flow: Flow = { format: FLOW_FORMAT, nodes: [], edges: [] },
): FlowState => ({ flow, rev: 0, undo: [], redo: [] });

export function applyCommand(state: FlowState, command: Command): FlowState {
  switch (command.type) {
    case "history.undo":
      return undo(state);
    case "history.redo":
      return redo(state);
    case "sources.rebind":
      return rebindState(state, command);
    case "flow.load":
      return { flow: command.flow, rev: state.rev + 1, undo: [], redo: [] };
    default:
      return edit(state, command);
  }
}

function edit(state: FlowState, flowEdit: FlowEdit): FlowState {
  return {
    flow: applyEdit(state.flow, flowEdit),
    rev: state.rev + 1,
    undo: [...state.undo, { edit: flowEdit, inverse: invertEdit(state.flow, flowEdit) }],
    redo: [],
  };
}

function undo(state: FlowState): FlowState {
  const entry = state.undo.at(-1);
  if (entry === undefined) return state;
  return {
    flow: applyEdit(state.flow, entry.inverse),
    rev: state.rev + 1,
    undo: state.undo.slice(0, -1),
    redo: [...state.redo, entry],
  };
}

function redo(state: FlowState): FlowState {
  const entry = state.redo.at(-1);
  if (entry === undefined) return state;
  return {
    flow: applyEdit(state.flow, entry.edit),
    rev: state.rev + 1,
    undo: [...state.undo, entry],
    redo: state.redo.slice(0, -1),
  };
}

type Rebinding = Extract<Command, { readonly type: "sources.rebind" }>;

function rebindParams(node: Flow["nodes"][number], command: Rebinding, manifestId?: string) {
  return {
    ...node,
    params: Object.fromEntries(
      Object.entries(node.params).map(([param, value]) => [
        param,
        reboundValue(
          { nodeId: node.id, param, ...(manifestId === undefined ? {} : { manifestId }) },
          value,
          command,
        ),
      ]),
    ),
  };
}

type SourceLocation = Pick<SourceTarget, "nodeId" | "param" | "manifestId">;
function reboundValue(location: SourceLocation, value: unknown, command: Rebinding): unknown {
  return (
    command.targets.find(
      (target) =>
        target.nodeId === location.nodeId &&
        target.param === location.param &&
        target.manifestId === location.manifestId &&
        target.previousSourceId === value,
    )?.sourceId ?? value
  );
}

function rebindManifest(manifest: NonNullable<Flow["customNodes"]>[number], command: Rebinding) {
  return manifest.impl.kind === "flow"
    ? {
        ...manifest,
        impl: {
          ...manifest.impl,
          graph: {
            ...manifest.impl.graph,
            nodes: manifest.impl.graph.nodes.map((node) =>
              rebindParams(node, command, manifest.id),
            ),
          },
        },
      }
    : manifest;
}

function rebindFlow(flow: Flow, command: Rebinding): Flow {
  return {
    ...flow,
    nodes: flow.nodes.map((node) => rebindParams(node, command)),
    ...(flow.customNodes === undefined
      ? {}
      : { customNodes: flow.customNodes.map((manifest) => rebindManifest(manifest, command)) }),
  };
}

function rebindEdit(edit: FlowEdit, command: Rebinding): FlowEdit {
  if (edit.type === "param.set") return { ...edit, value: reboundValue(edit, edit.value, command) };
  if (edit.type === "node.add") return { ...edit, node: rebindParams(edit.node, command) };
  if (edit.type === "customNode.add" || edit.type === "customNode.set")
    return { ...edit, manifest: rebindManifest(edit.manifest, command) };
  if (edit.type === "batch")
    return { ...edit, edits: edit.edits.map((item) => rebindEdit(item, command)) };
  return edit;
}

function rebindState(state: FlowState, command: Rebinding): FlowState {
  const rebindEntry = (entry: HistoryEntry) => ({
    edit: rebindEdit(entry.edit, command),
    inverse: rebindEdit(entry.inverse, command),
  });
  return {
    ...state,
    flow: rebindFlow(state.flow, command),
    rev: state.rev + 1,
    undo: state.undo.map(rebindEntry),
    redo: state.redo.map(rebindEntry),
  };
}
