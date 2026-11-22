import { err, ok, parse } from "@nodomics/protocol";
import { Type } from "@sinclair/typebox";
import { applyBatch, emptyFlow, revisionOf, type EditOp } from "./flow-edit/index.ts";
import type { UserIdentity } from "./identity.ts";
import { readDraft, readFlow, type ToolDeps } from "./tool-context.ts";
import { defineTool, type ToolDefinition, type ToolResult } from "./tool-definition.ts";
import { DraftRefSchema, OperationSchema, OperationSchemas } from "./tool-schema.ts";

export function draftTools(deps: ToolDeps): readonly ToolDefinition[] {
  return [
    defineTool({
      name: "flows.create_draft",
      description: "Create an isolated draft",
      schema: Type.Object({ flowId: Type.Optional(Type.String()) }),
      execute: (args, identity) => createDraft(deps, { ...args, identity }),
    }),
    defineTool({
      name: "flows.batch",
      description: "Apply an atomic batch to a draft",
      schema: Type.Object({ draftId: Type.String(), ops: Type.Array(OperationSchema) }),
      execute: (args, identity) => editDraft(deps, { ...args, identity }),
    }),
    defineTool({
      name: "flows.discard",
      description: "Discard a draft",
      schema: DraftRefSchema,
      execute: async ({ draftId }, identity) => {
        const draft = await readDraft(deps, draftId, identity);
        if (!draft.ok) return draft;
        const removed = await deps.storesFor(identity).drafts.remove(draftId);
        return removed.ok ? ok({ discarded: draftId }) : removed;
      },
    }),
    defineTool({
      name: "flows.declare_as_node",
      description: "Flow as node is not yet available",
      schema: Type.Object({
        draftId: Type.String(),
        name: Type.String(),
        inputs: Type.Array(Type.String()),
        params: Type.Array(Type.String()),
      }),
      execute: () =>
        Promise.resolve(err({ message: "flows.declare_as_node is not available yet" })),
    }),
    ...editTools(deps),
  ];
}
async function createDraft(
  deps: ToolDeps,
  { flowId, identity }: { flowId?: string; identity: UserIdentity },
): Promise<ToolResult> {
  const flow = flowId === undefined ? ok(emptyFlow()) : await readFlow(deps, { flowId }, identity);
  if (!flow.ok) return flow;
  const draft = {
    id: deps.createId(),
    flowId: flowId ?? `flow_${deps.createId()}`,
    baseRevision: revisionOf(flow.value),
    flow: flow.value,
  };
  const saved = await deps.storesFor(identity).drafts.create(draft);
  return saved.ok
    ? ok({ draftId: draft.id, flowId: draft.flowId, baseRevision: draft.baseRevision })
    : saved;
}
async function editDraft(
  deps: ToolDeps,
  { draftId, ops, identity }: { draftId: string; ops: readonly EditOp[]; identity: UserIdentity },
): Promise<ToolResult> {
  const draft = await readDraft(deps, draftId, identity);
  if (!draft.ok) return draft;
  const flow = applyBatch(draft.value.flow, ops, deps.catalog);
  if (!flow.ok) return flow;
  const saved = await deps.storesFor(identity).drafts.update({ ...draft.value, flow: flow.value });
  return saved.ok ? ok({ revision: revisionOf(flow.value), applied: ops.length }) : saved;
}
function editTools(deps: ToolDeps): readonly ToolDefinition[] {
  return Object.entries(OperationSchemas).map(([op, schema]) =>
    defineTool({
      name: `flows.${op}`,
      description: `Edit a draft: ${op}`,
      schema: Type.Object({ draftId: Type.String(), ...schema.properties }),
      execute: async (args, identity) => {
        const operation = { op, args };
        const parsed = parse(OperationSchema, operation);
        return parsed.ok
          ? singleEdit(deps, { draftId: args.draftId, ops: [parsed.value], identity })
          : err({ message: "Invalid operation" });
      },
    }),
  );
}
async function singleEdit(
  deps: ToolDeps,
  request: { draftId: string; ops: readonly EditOp[]; identity: UserIdentity },
): Promise<ToolResult> {
  const result = await editDraft(deps, request);
  if (!result.ok) return result;
  const draft = await readDraft(deps, request.draftId, request.identity);
  return draft.ok ? ok({ revision: revisionOf(draft.value.flow) }) : draft;
}
