import { parse, type Result, type ValidationIssue } from "@nodomics/protocol";
import { Type, type Static } from "@sinclair/typebox";

export const ProposalChange = Type.Object({
  id: Type.String(),
  kind: Type.Union([
    Type.Literal("add_node"),
    Type.Literal("remove_node"),
    Type.Literal("connect"),
    Type.Literal("disconnect"),
    Type.Literal("set_param"),
    Type.Literal("add_custom_node"),
    Type.Literal("update_custom_node"),
  ]),
  target: Type.String(),
  before: Type.Optional(Type.Unknown()),
  after: Type.Optional(Type.Unknown()),
  reason: Type.String({ minLength: 1 }),
  dependsOn: Type.Array(Type.String()),
});
export type ProposalChange = Static<typeof ProposalChange>;

export const Proposal = Type.Object({
  id: Type.String(),
  flowId: Type.String(),
  draftId: Type.String(),
  baseRevision: Type.String(),
  version: Type.Number(),
  status: Type.Union([
    Type.Literal("pending"),
    Type.Literal("partially_accepted"),
    Type.Literal("accepted"),
    Type.Literal("rejected"),
    Type.Literal("stale"),
  ]),
  changes: Type.Array(ProposalChange),
});
export type Proposal = Static<typeof Proposal>;

export function parseProposal(json: unknown): Result<Proposal, ValidationIssue[]> {
  return parse(Proposal, json);
}
