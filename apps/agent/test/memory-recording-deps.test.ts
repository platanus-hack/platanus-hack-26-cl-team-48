import { ok } from "@nodomics/protocol";
import { expect, it } from "vitest";
import type { Proposal } from "../src/contracts/proposal.ts";
import { createFakeMemory } from "../src/memory/fake-memory.ts";
import { buildMemoryDeps } from "../src/memory/recording-mcp-deps.ts";
import type { McpPort } from "../src/mcp/mcp-port.ts";

const AT = "2026-11-21T10:00:00.000Z";
const IDENTITY = { userId: "user-1", accessToken: "t" };
const MCP: McpPort = {
  listTools: () => Promise.resolve(ok([])),
  call: () => Promise.resolve(ok(1)),
};
const PROPOSAL: Proposal = {
  id: "p1",
  flowId: "f1",
  draftId: "d1",
  baseRevision: "r",
  version: 1,
  status: "accepted",
  changes: [{ id: "c1", kind: "set_param", target: "n.h", after: 2, reason: "r", dependsOn: [] }],
};

it("wrapMcp records episodes on the shared memory", async () => {
  const memory = createFakeMemory();
  const deps = buildMemoryDeps(memory, () => AT);
  await deps.wrapMcp(MCP).call("nodes.list", { flowId: "f1" }, IDENTITY);
  const found = await memory.episodesFor("f1");
  expect(found.ok && found.value).toHaveLength(1);
});

it("recordDecision updates the graph on the shared memory using the clock", async () => {
  const memory = createFakeMemory();
  const deps = buildMemoryDeps(memory, () => AT);
  await deps.recordDecision({ actorId: "user-1", proposal: PROPOSAL, acceptedIds: ["c1"] });
  const edges = await memory.edgesAt("n.h", AT);
  expect(edges.ok && edges.value.map((e) => e.dst)).toEqual(["2"]);
});

it("defaults to the system clock", async () => {
  const memory = createFakeMemory();
  await buildMemoryDeps(memory).recordDecision({
    actorId: "u",
    proposal: PROPOSAL,
    acceptedIds: [],
  });
  const found = await memory.episodesFor("f1");
  expect(found.ok && Date.parse(found.value[0]?.at ?? "")).not.toBeNaN();
});
