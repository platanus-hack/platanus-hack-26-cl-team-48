import { expect, it } from "vitest";
import { parseProposal } from "../src/contracts/proposal.ts";

const CHANGE = { id: "change-1", kind: "set_param", target: "harvest.window", dependsOn: [] };
const PROPOSAL = {
  id: "proposal-1",
  flowId: "flow-1",
  draftId: "draft-1",
  baseRevision: "sha-1",
  version: 1,
  status: "pending",
};

it("parseProposal rejects change without reason", () => {
  const result = parseProposal({ ...PROPOSAL, changes: [CHANGE] });

  expect(result.ok ? [] : result.error.map(({ path }) => path)).toContain("/changes/0/reason");
});

it("parseProposal rejects an empty reason", () => {
  const result = parseProposal({ ...PROPOSAL, changes: [{ ...CHANGE, reason: "" }] });

  expect(result.ok ? [] : result.error.map(({ path }) => path)).toContain("/changes/0/reason");
});

it("parseProposal accepts a change with optional values omitted", () => {
  const proposal = { ...PROPOSAL, changes: [{ ...CHANGE, reason: "Match the harvest window" }] };

  expect(parseProposal(proposal)).toEqual({ ok: true, value: proposal });
});
