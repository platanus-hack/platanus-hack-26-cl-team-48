import { err, ok } from "@nodomics/protocol";
import { describe, expect, it } from "vitest";
import type { Proposal, ProposalChange } from "../src/contracts/proposal.ts";
import type { McpPort, UserIdentity } from "../src/mcp/mcp-port.ts";
import { decideProposal } from "../src/proposals/decide.ts";
import type { ProposalStorePort, StoredProposal } from "../src/proposals/proposal-store-port.ts";

const IDENTITY: UserIdentity = { userId: "owner", accessToken: "owner-jwt" };
const CHANGE_A: ProposalChange = {
  id: "a",
  kind: "add_node",
  target: "node-a",
  reason: "Add a node",
  dependsOn: [],
};
const CHANGE_B: ProposalChange = {
  id: "b",
  kind: "connect",
  target: "node-a.out->node-b.in",
  reason: "Connect it",
  dependsOn: ["a"],
};
const PROPOSAL: Proposal = {
  id: "proposal-1",
  flowId: "flow-1",
  draftId: "draft-1",
  baseRevision: "revision-1",
  version: 2,
  status: "pending",
  changes: [CHANGE_A, CHANGE_B],
};
const STORED: StoredProposal = {
  proposal: PROPOSAL,
  ownerId: IDENTITY.userId,
  cards: [{ changeId: "a", title: "Node A", reason: "Add a node" }],
};

type StoreHarness = {
  readonly store: ProposalStorePort;
  readonly read: () => StoredProposal;
  readonly updates: Array<{
    readonly expectedVersion: number;
    readonly status: Proposal["status"];
  }>;
};

function memoryStore(seed: StoredProposal = STORED): StoreHarness {
  let current = seed;
  const updates: StoreHarness["updates"] = [];
  return {
    read: () => current,
    updates,
    store: {
      save: () => Promise.resolve(ok(undefined)),
      get: (id, ownerId) =>
        Promise.resolve(
          id === current.proposal.id && ownerId === current.ownerId
            ? ok(current)
            : err({ code: "NOT_FOUND" as const, message: "Not found" }),
        ),
      updateStatus: ({ id, ownerId, expectedVersion, status }) => {
        if (id !== current.proposal.id || ownerId !== current.ownerId) {
          return Promise.resolve(err({ code: "NOT_FOUND" as const, message: "Not found" }));
        }
        if (expectedVersion !== current.proposal.version) {
          return Promise.resolve(
            err({ code: "VERSION_CONFLICT" as const, message: "Version changed" }),
          );
        }
        updates.push({ expectedVersion, status });
        current = {
          ...current,
          proposal: { ...current.proposal, status, version: current.proposal.version + 1 },
        };
        return Promise.resolve(ok(undefined));
      },
    },
  };
}

type McpCall = { readonly name: string; readonly args: unknown; readonly identity: UserIdentity };
function recordingMcp(isStale = false): { readonly mcp: McpPort; readonly calls: McpCall[] } {
  const calls: McpCall[] = [];
  return {
    calls,
    mcp: {
      listTools: () => Promise.resolve(ok([])),
      call: (name, args, identity) => {
        calls.push({ name, args, identity });
        return Promise.resolve(
          ok(
            name === "flows.diff"
              ? { stale: isStale, baseRevision: "revision-1", changes: [] }
              : { flowId: "flow-1", revision: "revision-2", applied: ["a"] },
          ),
        );
      },
    },
  };
}

const decide = (
  store: ProposalStorePort,
  mcp: McpPort,
  options: {
    readonly acceptedIds: readonly string[];
    readonly expectedVersion?: number;
    readonly identity?: UserIdentity;
  },
) =>
  decideProposal({
    store,
    mcp,
    identity: options.identity ?? IDENTITY,
    proposalId: "proposal-1",
    acceptedIds: options.acceptedIds,
    expectedVersion: options.expectedVersion ?? 2,
  });

describe("decideProposal", () => {
  it("applies only selected changes", async () => {
    const { store, read, updates } = memoryStore();
    const { mcp, calls } = recordingMcp();

    const result = await decide(store, mcp, { acceptedIds: ["a"] });

    expect(result.ok && result.value.status).toBe("partially_accepted");
    expect(calls.filter((call) => call.name === "flows.apply")).toEqual([
      {
        name: "flows.apply",
        args: { draftId: "draft-1", changeIds: ["a"], baseRevision: "revision-1" },
        identity: IDENTITY,
      },
    ]);
    expect(updates).toEqual([{ expectedVersion: 2, status: "partially_accepted" }]);
    expect(read().proposal.version).toBe(3);
  });

  it("stale base revision marks proposal stale and applies nothing", async () => {
    const { store, read } = memoryStore();
    const { mcp, calls } = recordingMcp(true);

    const result = await decide(store, mcp, { acceptedIds: ["a"] });

    expect(result).toMatchObject({ ok: false, error: { code: "STALE" } });
    expect(read().proposal.status).toBe("stale");
    expect(calls.map((call) => call.name)).toEqual(["flows.diff"]);
  });

  it("other user's proposal is not found", async () => {
    const { store } = memoryStore();
    const { mcp, calls } = recordingMcp();

    const result = await decide(store, mcp, {
      acceptedIds: ["a"],
      identity: { userId: "other", accessToken: "other-jwt" },
    });

    expect(result).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    expect(calls).toEqual([]);
  });

  it("version conflict is reported, nothing applied twice", async () => {
    const { store } = memoryStore();
    const { mcp, calls } = recordingMcp();

    const first = await decide(store, mcp, { acceptedIds: ["a"] });
    const second = await decide(store, mcp, { acceptedIds: ["a"] });

    expect(first.ok).toBe(true);
    expect(second).toMatchObject({ ok: false, error: { code: "VERSION_CONFLICT" } });
    expect(calls.filter((call) => call.name === "flows.apply")).toHaveLength(1);
    expect(calls.filter((call) => call.name === "flows.diff")).toHaveLength(1);
  });

  it("rejects without applying when no changes are accepted", async () => {
    const { store, read } = memoryStore();
    const { mcp, calls } = recordingMcp();

    const result = await decide(store, mcp, { acceptedIds: [] });

    expect(result.ok && result.value.status).toBe("rejected");
    expect(read().proposal.status).toBe("rejected");
    expect(calls.some((call) => call.name === "flows.apply")).toBe(false);
  });
});
