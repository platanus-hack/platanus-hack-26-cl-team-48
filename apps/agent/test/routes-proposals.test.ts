import { err, ok } from "@nodomics/protocol";
import { describe, expect, it } from "vitest";
import type { Proposal } from "../src/contracts/proposal.ts";
import type { Route, RouteRequest } from "../src/http/route.ts";
import { createProposalRoutes } from "../src/http/routes/proposals.ts";
import type { McpPort } from "../src/mcp/mcp-port.ts";
import type { ProposalStorePort, StoredProposal } from "../src/proposals/proposal-store-port.ts";

const IDENTITY = { userId: "owner", accessToken: "owner-jwt" };
const PROPOSAL: Proposal = {
  id: "p1",
  flowId: "flow-1",
  draftId: "draft-1",
  baseRevision: "rev-1",
  version: 1,
  status: "pending",
  changes: [{ id: "a", kind: "add_node", target: "node-a", reason: "Add node", dependsOn: [] }],
};
const STORED: StoredProposal = {
  proposal: PROPOSAL,
  ownerId: "owner",
  cards: [{ changeId: "a", title: "Harvest window", reason: "Add node" }],
};

function memoryStore(): ProposalStorePort {
  let current = STORED;
  return {
    save: () => Promise.resolve(ok(undefined)),
    get: (id, ownerId) =>
      Promise.resolve(
        id === current.proposal.id && ownerId === current.ownerId
          ? ok(current)
          : err({ code: "NOT_FOUND" as const, message: "Not found" }),
      ),
    updateStatus: ({ expectedVersion, status }) => {
      if (expectedVersion !== current.proposal.version) {
        return Promise.resolve(
          err({ code: "VERSION_CONFLICT" as const, message: "Version changed" }),
        );
      }
      current = {
        ...current,
        proposal: { ...current.proposal, status, version: current.proposal.version + 1 },
      };
      return Promise.resolve(ok(undefined));
    },
  };
}

function recordingMcp(isStale = false): { readonly mcp: McpPort; readonly names: string[] } {
  const names: string[] = [];
  return {
    names,
    mcp: {
      listTools: () => Promise.resolve(ok([])),
      call: (name) => {
        names.push(name);
        return Promise.resolve(
          ok(
            name === "flows.diff"
              ? { stale: isStale, baseRevision: "rev-1", changes: [] }
              : { flowId: "flow-1", revision: "rev-2", applied: ["a"] },
          ),
        );
      },
    },
  };
}

function route(routes: readonly Route[], method: Route["method"]): Route {
  const selected = routes.find((candidate) => candidate.method === method);
  if (!selected) throw new Error(`Missing ${method} route`);
  return selected;
}

function request(rawBody = "", identity = IDENTITY): RouteRequest {
  return { params: { id: "p1" }, query: {}, identity, rawBody };
}

const DECISION = JSON.stringify({ acceptedIds: ["a"], version: 1 });

describe("proposal routes", () => {
  it("GET proposal returns 200 with proposal and cards", async () => {
    const routes = createProposalRoutes({ store: memoryStore(), mcp: recordingMcp().mcp });
    const get = route(routes, "GET");

    expect(get.path).toBe("/agent/proposals/:id");
    expect(await get.handle(request())).toEqual({
      status: 200,
      body: {
        proposal: PROPOSAL,
        cards: STORED.cards,
      },
    });
  });

  it("POST decision returns 200 with the decided proposal", async () => {
    const routes = createProposalRoutes({ store: memoryStore(), mcp: recordingMcp().mcp });
    const post = route(routes, "POST");

    const reply = await post.handle(request(DECISION));

    expect(post.path).toBe("/agent/proposals/:id/decision");
    expect(reply).toMatchObject({ status: 200, body: { id: "p1", status: "accepted" } });
  });

  it("GET proposal returns 404 for another user", async () => {
    const get = route(
      createProposalRoutes({ store: memoryStore(), mcp: recordingMcp().mcp }),
      "GET",
    );

    expect(await get.handle(request("", { userId: "other", accessToken: "other-jwt" }))).toEqual({
      status: 404,
      body: { error: "not_found" },
    });
  });

  it.each([
    "not-json",
    JSON.stringify({ acceptedIds: "a", version: 1 }),
    JSON.stringify({ acceptedIds: ["a"], version: "1" }),
  ])("POST decision returns 400 for invalid body %s", async (rawBody) => {
    const { mcp, names } = recordingMcp();
    const post = route(createProposalRoutes({ store: memoryStore(), mcp }), "POST");

    expect(await post.handle(request(rawBody))).toEqual({
      status: 400,
      body: { error: "invalid_body" },
    });
    expect(names).toEqual([]);
  });

  it("POST decision returns 409 for a version conflict", async () => {
    const { mcp, names } = recordingMcp();
    const post = route(createProposalRoutes({ store: memoryStore(), mcp }), "POST");

    const reply = await post.handle(request(JSON.stringify({ acceptedIds: ["a"], version: 0 })));

    expect(reply).toEqual({ status: 409, body: { error: "version_conflict" } });
    expect(names).toEqual([]);
  });

  it("POST decision returns 409 for a stale proposal without applying", async () => {
    const { mcp, names } = recordingMcp(true);
    const post = route(createProposalRoutes({ store: memoryStore(), mcp }), "POST");

    expect(await post.handle(request(DECISION))).toEqual({ status: 409, body: { error: "stale" } });
    expect(names).toEqual(["flows.diff"]);
  });

  it("decision never calls the llm", async () => {
    const { mcp, names } = recordingMcp();
    const llmCalls: string[] = [];
    const deps = {
      store: memoryStore(),
      mcp,
      llm: {
        complete: () => {
          llmCalls.push("complete");
          return Promise.resolve(err({ code: "NETWORK" as const, message: "Unavailable" }));
        },
      },
    };
    const post = route(createProposalRoutes(deps), "POST");

    expect((await post.handle(request(DECISION))).status).toBe(200);
    expect(names).toEqual(["flows.diff", "flows.apply"]);
    expect(llmCalls).toEqual([]);
  });
});
