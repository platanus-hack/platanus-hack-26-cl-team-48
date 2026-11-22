import { err, ok, type Flow, type Result } from "@nodomics/protocol";
import { Type } from "@sinclair/typebox";
import { applyChanges, diffFlows, emptyFlow, revisionOf } from "./flow-edit/index.ts";
import type { UserIdentity } from "./identity.ts";
import type { Draft, FlowDocument, StoreError } from "./stores.ts";
import { readDraft, type ToolDeps } from "./tool-context.ts";
import { defineTool, type ToolDefinition, type ToolResult } from "./tool-definition.ts";
import { DraftRefSchema } from "./tool-schema.ts";

type DraftContext = {
  readonly draft: Draft;
  readonly document: FlowDocument | undefined;
  readonly base: Flow;
  readonly stale: boolean;
};
export const applyTools = (deps: ToolDeps): readonly ToolDefinition[] => [
  defineTool({
    name: "flows.diff",
    description: "Inspect a draft's changes",
    schema: DraftRefSchema,
    execute: async ({ draftId }, identity) => {
      const context = await draftContext(deps, { draftId, identity });
      return context.ok
        ? ok({
            baseRevision: context.value.draft.baseRevision,
            stale: context.value.stale,
            changes: diffFlows(context.value.base, context.value.draft.flow),
          })
        : context;
    },
  }),
  defineTool({
    name: "flows.apply",
    description: "Apply reviewed changes to your flow",
    schema: Type.Object({
      draftId: Type.String(),
      changeIds: Type.Optional(Type.Array(Type.String())),
    }),
    execute: (args, identity) => applyDraft(deps, { ...args, identity }),
  }),
];
async function draftContext(
  deps: ToolDeps,
  { draftId, identity }: { draftId: string; identity: UserIdentity },
): Promise<Result<DraftContext, StoreError>> {
  const draft = await readDraft(deps, draftId, identity);
  if (!draft.ok) return draft;
  const document = await deps.storesFor(identity).flows.read(draft.value.flowId);
  if (!document.ok) return document;
  const base = document.value?.flow ?? emptyFlow();
  return ok({
    draft: draft.value,
    document: document.value,
    base,
    stale: document.value !== undefined && revisionOf(base) !== draft.value.baseRevision,
  });
}
async function applyDraft(
  deps: ToolDeps,
  {
    draftId,
    changeIds,
    identity,
  }: { draftId: string; changeIds?: readonly string[]; identity: UserIdentity },
): Promise<ToolResult> {
  const context = await draftContext(deps, { draftId, identity });
  if (!context.ok) return context;
  if (context.value.stale) return err({ message: "Draft is stale: the original flow changed" });
  const changes = diffFlows(context.value.base, context.value.draft.flow);
  const flow =
    changeIds === undefined
      ? ok(context.value.draft.flow)
      : applyChanges(context.value.base, context.value.draft.flow, changeIds);
  if (!flow.ok) return flow;
  const saved = await deps
    .storesFor(identity)
    .flows.write(documentFor(deps, context.value, flow.value));
  if (!saved.ok) return saved;
  const removed = await deps.storesFor(identity).drafts.remove(draftId);
  return removed.ok
    ? ok({
        flowId: context.value.draft.flowId,
        revision: revisionOf(flow.value),
        applied: changes
          .filter((change) => changeIds === undefined || changeIds.includes(change.id))
          .map((change) => change.id),
      })
    : removed;
}
function documentFor(deps: ToolDeps, context: DraftContext, flow: Flow): FlowDocument {
  return {
    ...(context.document ?? {
      id: context.draft.flowId,
      name: flow.name || "Flujo del agente",
      files: {},
    }),
    flow,
    updatedAt: deps.now(),
  };
}
