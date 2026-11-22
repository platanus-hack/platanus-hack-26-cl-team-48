import { Type } from "@sinclair/typebox";
import { diffFlows, applyEntries } from "./fake-diff.ts";
import { emptyFlow, omitKey, revisionOf, type FakeFlow } from "./fake-flow.ts";
import { DRAFT_OPS, runBatch, type DraftOp } from "./fake-ops.ts";
import {
  defineTool,
  done,
  toolFailed,
  type FakeDraft,
  type FakeState,
  type FakeTool,
  type ToolOutcome,
} from "./fake-tool.ts";

const DraftRef = Type.Object({ draftId: Type.String() });

function updateDraft(state: FakeState, draft: FakeDraft, flow: FakeFlow): FakeState {
  return { ...state, drafts: { ...state.drafts, [draft.id]: { ...draft, flow } } };
}

function opTool(op: DraftOp): FakeTool {
  return defineTool({
    name: `flows.${op.name}`,
    description: op.description,
    schema: Type.Composite([DraftRef, op.schema]),
    handler: (state, args) => {
      const draft = state.drafts[args.draftId];
      if (!draft) return toolFailed(`Draft "${args.draftId}" does not exist`);
      const result = op.run(draft.flow, state.catalog, args);
      return result.ok
        ? done(updateDraft(state, draft, result.value), { revision: revisionOf(result.value) })
        : toolFailed(result.error);
    },
  });
}

const batchTool = defineTool({
  name: "flows.batch",
  description: "Apply several draft operations atomically: all succeed or none change the draft.",
  schema: Type.Object({
    draftId: Type.String(),
    ops: Type.Array(Type.Object({ op: Type.String(), args: Type.Unknown() })),
  }),
  handler: (state, { draftId, ops }) => {
    const draft = state.drafts[draftId];
    if (!draft) return toolFailed(`Draft "${draftId}" does not exist`);
    const result = runBatch(draft.flow, state.catalog, ops);
    return result.ok
      ? done(updateDraft(state, draft, result.value), {
          revision: revisionOf(result.value),
          applied: ops.length,
        })
      : toolFailed(result.error);
  },
});

const createDraftTool = defineTool({
  name: "flows.create_draft",
  description: "Create an isolated draft from a flow, or an empty one when flowId is omitted.",
  schema: Type.Object({ flowId: Type.Optional(Type.String()) }),
  handler: (state, { flowId }) => {
    const counter = state.counter + 1;
    const id = flowId ?? `flow-${String(counter)}`;
    const base = state.flows[id] ?? (flowId === undefined ? emptyFlow(id) : undefined);
    if (!base) return toolFailed(`Flow "${id}" does not exist`);
    const draft = {
      id: `draft-${String(counter)}`,
      flowId: id,
      base,
      baseRevision: revisionOf(base),
      flow: base,
    };
    const next = { ...state, counter, drafts: { ...state.drafts, [draft.id]: draft } };
    return done(next, { draftId: draft.id, flowId: id, baseRevision: draft.baseRevision });
  },
});

const diffTool = defineTool({
  name: "flows.diff",
  description: "List the changes between the draft and its original, with before and after.",
  schema: DraftRef,
  handler: (state, { draftId }) => {
    const draft = state.drafts[draftId];
    if (!draft) return toolFailed(`Draft "${draftId}" does not exist`);
    const current = state.flows[draft.flowId] ?? emptyFlow(draft.flowId);
    const changes = diffFlows(draft.base, draft.flow).map(({ change }) => change);
    const stale = revisionOf(current) !== draft.baseRevision;
    return done(state, { baseRevision: draft.baseRevision, stale, changes });
  },
});

function applyDraft(
  state: FakeState,
  draft: FakeDraft,
  changeIds: readonly string[] | undefined,
): ToolOutcome {
  const current = state.flows[draft.flowId] ?? emptyFlow(draft.flowId);
  if (revisionOf(current) !== draft.baseRevision) {
    return toolFailed(`Base revision of "${draft.flowId}" changed since the draft was created`);
  }
  const entries = diffFlows(draft.base, draft.flow);
  const unknown = (changeIds ?? []).filter((id) => !entries.some(({ change }) => change.id === id));
  if (unknown.length > 0) return toolFailed(`Unknown change ids: ${unknown.join(", ")}`);
  const chosen = entries.filter(({ change }) => !changeIds || changeIds.includes(change.id));
  const flow = applyEntries(current, chosen);
  const next = {
    ...state,
    flows: { ...state.flows, [flow.id]: flow },
    drafts: omitKey(state.drafts, draft.id),
  };
  return done(next, {
    flowId: flow.id,
    revision: revisionOf(flow),
    applied: chosen.map((e) => e.change.id),
  });
}

const applyTool = defineTool({
  name: "flows.apply",
  description:
    "Apply the draft, or only some changes, to the original. Fails if the original changed.",
  schema: Type.Object({
    draftId: Type.String(),
    changeIds: Type.Optional(Type.Array(Type.String())),
  }),
  handler: (state, { draftId, changeIds }) => {
    const draft = state.drafts[draftId];
    return draft
      ? applyDraft(state, draft, changeIds)
      : toolFailed(`Draft "${draftId}" does not exist`);
  },
});

const discardTool = defineTool({
  name: "flows.discard",
  description: "Discard a draft without applying it.",
  schema: DraftRef,
  handler: (state, { draftId }) =>
    state.drafts[draftId]
      ? done({ ...state, drafts: omitKey(state.drafts, draftId) }, { discarded: draftId })
      : toolFailed(`Draft "${draftId}" does not exist`),
});

export const DRAFT_TOOLS: readonly FakeTool[] = [
  createDraftTool,
  ...DRAFT_OPS.map(opTool),
  batchTool,
  diffTool,
  applyTool,
  discardTool,
];
