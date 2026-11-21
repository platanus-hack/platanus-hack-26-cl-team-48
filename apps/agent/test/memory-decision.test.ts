import { describe, expect, it } from "vitest";
import type { Proposal } from "../src/contracts/proposal.ts";
import { rememberDecision } from "../src/memory/decision-memory.ts";
import { createFakeMemory } from "../src/memory/fake-memory.ts";

const T1 = "2026-11-21T10:00:00.000Z";
const T2 = "2026-11-21T11:40:00.000Z";
const T3 = "2026-11-21T12:00:00.000Z";

const PROPOSAL: Proposal = {
  id: "prop-1",
  flowId: "flow-1",
  draftId: "draft-1",
  baseRevision: "r1",
  version: 1,
  status: "partially_accepted",
  changes: [
    {
      id: "c1",
      kind: "set_param",
      target: "node-a.hours",
      before: 4,
      after: 2,
      reason: "r",
      dependsOn: [],
    },
    {
      id: "c2",
      kind: "set_param",
      target: "node-b.mode",
      before: "x",
      after: "y",
      reason: "r",
      dependsOn: [],
    },
    { id: "c3", kind: "add_node", target: "node-c", reason: "r", dependsOn: [] },
  ],
};

const decide = (memory: ReturnType<typeof createFakeMemory>, acceptedIds: string[], at: string) =>
  rememberDecision(memory, { actorId: "user-1", proposal: PROPOSAL, acceptedIds, at });

describe("rememberDecision", () => {
  it("accepted set_param opens new edge and closes old one", async () => {
    const memory = createFakeMemory();
    await memory.openEdge({ src: "node-a.hours", dst: "4", relation: "has_value", at: T1 });
    expect(await decide(memory, ["c1"], T2)).toEqual({ ok: true, value: undefined });
    const before = await memory.edgesAt("node-a.hours", T1);
    const after = await memory.edgesAt("node-a.hours", T3);
    expect(before.ok && before.value.map((e) => e.dst)).toEqual(["4"]);
    expect(after.ok && after.value.map((e) => e.dst)).toEqual(["2"]);
  });

  it("opens the first value when the param had none, ignoring non set_param changes", async () => {
    const memory = createFakeMemory();
    await decide(memory, ["c1", "c3"], T2);
    const edges = await memory.edgesAt("node-a.hours", T3);
    expect(edges.ok && edges.value).toHaveLength(1);
    const added = await memory.edgesAt("node-c", T3);
    expect(added.ok && added.value).toHaveLength(0);
  });

  it("rejected changes leave the graph untouched", async () => {
    const memory = createFakeMemory();
    await memory.openEdge({ src: "node-a.hours", dst: "4", relation: "has_value", at: T1 });
    await decide(memory, ["c2"], T2);
    const kept = await memory.edgesAt("node-a.hours", T3);
    expect(kept.ok && kept.value.map((e) => [e.dst, e.validTo])).toEqual([["4", null]]);
  });

  it("records one proposal_decision episode with accepted and rejected ids", async () => {
    const memory = createFakeMemory();
    await decide(memory, ["c1"], T2);
    const found = await memory.episodesFor("flow-1");
    expect(found.ok && found.value).toHaveLength(1);
    expect(found.ok && found.value[0]).toMatchObject({
      kind: "proposal_decision",
      actorId: "user-1",
      at: T2,
      payload: { proposalId: "prop-1", acceptedIds: ["c1"], rejectedIds: ["c2", "c3"] },
    });
  });

  it("returns the memory error and stops when the store fails", async () => {
    const down = { ok: false, error: { code: "STORE_FAILED", message: "down" } } as const;
    const memory = { ...createFakeMemory(), recordEpisode: () => Promise.resolve(down) };
    expect(
      await rememberDecision(memory, {
        actorId: "u",
        proposal: PROPOSAL,
        acceptedIds: ["c1"],
        at: T2,
      }),
    ).toEqual(down);
  });
});
