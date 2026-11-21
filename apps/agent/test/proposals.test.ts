import { describe, expect, it } from "vitest";
import { Type } from "@sinclair/typebox";
import type { NodeManifest } from "@nodomics/protocol";
import type { Proposal, ProposalChange } from "../src/contracts/proposal.ts";
import type { DiffEntry } from "../src/mcp/fake-diff.ts";
import { toDomainCards } from "../src/proposals/domain-cards.ts";
import { selectChanges } from "../src/proposals/select-changes.ts";
import { nextStatus } from "../src/proposals/proposal-status.ts";
import { toProposalChanges } from "../src/proposals/from-diff.ts";

const manifest: NodeManifest = {
  id: "calc.window",
  version: "1.0.0",
  name: "Time window",
  category: "calc",
  inputs: [],
  outputs: [],
  params: {
    type: "object",
    properties: {
      hours: Type.Number({ title: "Harvest window", "x-unit": "h" }),
    },
  },
  impl: { kind: "sql", template: "" },
};
const change = (id: string, dependsOn: string[] = []): ProposalChange => ({
  id,
  kind: "set_param",
  target: "node-1.hours",
  before: 4,
  after: 2,
  reason: "Adjust the window",
  dependsOn,
});
const proposal = (changes: ProposalChange[]): Proposal => ({
  id: "p",
  flowId: "f",
  draftId: "d",
  baseRevision: "rev-1",
  version: 1,
  status: "pending",
  changes,
});

describe("domain cards", () => {
  it("domain card shows param title and unit, not path", () => {
    const cards = toDomainCards([change("c1")], { "node-1": manifest });
    expect(cards).toEqual([
      {
        changeId: "c1",
        title: "Harvest window",
        before: 4,
        after: 2,
        unit: "h",
        reason: "Adjust the window",
      },
    ]);
    expect(cards[0]?.title).not.toContain("node-1");
  });

  it("add_node card uses manifest name", () => {
    const added: ProposalChange = {
      id: "a",
      kind: "add_node",
      target: "node-1",
      after: { id: "node-1", type: "calc.window", params: {} },
      reason: "Add window",
      dependsOn: [],
    };
    expect(toDomainCards([added], { "node-1": manifest })[0]?.title).toBe("Time window");
  });

  it("no changes yields no cards", () => {
    expect(toDomainCards([], {})).toEqual([]);
  });
});

describe("selection", () => {
  it("partial accept drops dependent changes", () => {
    expect(selectChanges(proposal([change("base"), change("child", ["base"])]), ["base"])).toEqual({
      ok: true,
      value: [change("base")],
    });
  });

  it("accepting a change pulls its dependencies", () => {
    const result = selectChanges(proposal([change("base"), change("child", ["base"])]), ["child"]);
    expect(result.ok && result.value.map((entry) => entry.id)).toEqual(["base", "child"]);
  });

  it("unknown change id is an error", () => {
    expect(selectChanges(proposal([change("base")]), ["missing"]).ok).toBe(false);
  });
});

describe("status", () => {
  it("marks proposal stale when base revision changed", () => {
    expect(
      nextStatus(proposal([change("a")]), { currentRevision: "rev-2", acceptedIds: ["a"] }),
    ).toBe("stale");
  });

  it.each([
    [["a", "b"], "accepted"],
    [["a"], "partially_accepted"],
    [[], "rejected"],
  ] as const)("returns %s selection as %s", (acceptedIds, status) => {
    expect(
      nextStatus(proposal([change("a"), change("b")]), { currentRevision: "rev-1", acceptedIds }),
    ).toBe(status);
  });
});

describe("diff conversion", () => {
  it("diff entries become proposal changes with dependencies", () => {
    const entries = [
      { change: { id: "add_node:node-1", kind: "add_node", target: "node-1", after: {} } },
      {
        change: {
          id: "set_param:node-1.hours",
          kind: "set_param",
          target: "node-1.hours",
          after: 2,
        },
      },
    ] as DiffEntry[];
    expect(toProposalChanges(entries)).toEqual([
      { ...entries[0]?.change, reason: "", needsReason: true, dependsOn: [] },
      { ...entries[1]?.change, reason: "", needsReason: true, dependsOn: ["add_node:node-1"] },
    ]);
  });
});
