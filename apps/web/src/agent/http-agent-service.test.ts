import { describe, expect, it } from "vitest";
import { createHttpAgentService } from "./http-agent-service.ts";

const BASE_URL = "https://agent.example.com";
const TOKEN = "token-123";
const GOAL = "Marca las ventas fuera de lo normal";
const FLOW_ID = "flow-1";
const PROPOSAL_ID = "proposal-1";

const CARD = {
  changeId: "change-1",
  title: "Umbral de atípicos",
  before: 2,
  after: 3,
  unit: "desvíos",
  reason: "Con 2 desvíos se marcan demasiadas ventas.",
};
const OTHER_CARD = { changeId: "change-2", title: "Nodo nuevo", reason: "Marca los atípicos." };

const ANSWER_ONLY = { summary: "El flujo agrupa ventas por mes.", steps: 2 };
const ANSWER_WITH_PROPOSAL = {
  summary: "Propongo 2 cambios.",
  steps: 5,
  draftId: "draft-1",
  proposalId: PROPOSAL_ID,
  cards: [CARD],
};
const PROPOSAL = {
  id: PROPOSAL_ID,
  flowId: FLOW_ID,
  draftId: "draft-1",
  baseRevision: "rev-4",
  version: 7,
  status: "pending",
  changes: [
    {
      id: "change-1",
      kind: "set_param",
      target: "node-1.threshold",
      before: 2,
      after: 3,
      reason: CARD.reason,
      dependsOn: [],
    },
    { id: "change-2", kind: "add_node", target: "node-2", reason: "x", dependsOn: [] },
  ],
};
const PROPOSAL_REPLY = { proposal: PROPOSAL, cards: [CARD, OTHER_CARD] };

type Call = { readonly url: string; readonly init: RequestInit | undefined };
type Reply = { readonly status: number; readonly body?: unknown; readonly raw?: string } | Error;

function urlOf(input: Parameters<typeof fetch>[0]): string {
  if (typeof input === "string") return input;
  return input instanceof URL ? input.href : input.url;
}

function responseOf(reply: Exclude<Reply, Error>): Response {
  const text = reply.raw ?? (reply.body === undefined ? null : JSON.stringify(reply.body));
  return new Response(text, {
    status: reply.status,
    headers: { "content-type": "application/json" },
  });
}

/** Answers each fetch with the next reply, in order; the last one repeats. */
function setup(
  replies: ReadonlyArray<Reply> = [{ status: 200, body: {} }],
  options: { readonly hasToken?: boolean; readonly baseUrl?: string } = {},
) {
  const calls: Call[] = [];
  const fakeFetch = (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
    calls.push({ url: urlOf(input), init });
    const reply = replies[Math.min(calls.length - 1, replies.length - 1)] ?? { status: 500 };
    if (reply instanceof Error) return Promise.reject(reply);
    return Promise.resolve(responseOf(reply));
  };
  const service = createHttpAgentService({
    baseUrl: options.baseUrl ?? BASE_URL,
    getAccessToken: () => Promise.resolve((options.hasToken ?? true) ? TOKEN : undefined),
    fetch: fakeFetch,
  });
  return { service, calls };
}

type Service = ReturnType<typeof setup>["service"];

const headerOf = (call: Call | undefined, name: string) =>
  new Headers(call?.init?.headers).get(name);
const bodyOf = (call: Call | undefined): unknown =>
  JSON.parse(typeof call?.init?.body === "string" ? call.init.body : "null");
const methodOf = (call: Call | undefined) => call?.init?.method ?? "GET";

const ask = (service: Service) => service.ask({ goal: GOAL, flowId: FLOW_ID });
const decide = (service: Service) =>
  service.decide(PROPOSAL_ID, { acceptedIds: ["change-1"], version: 7 });

describe("createHttpAgentService ask requests", () => {
  it("posts the goal and the flow id, and nothing else, to the requests path", async () => {
    const { service, calls } = setup([{ status: 200, body: ANSWER_ONLY }]);

    await ask(service);

    expect({ url: calls[0]?.url, method: methodOf(calls[0]), body: bodyOf(calls[0]) }).toEqual({
      url: `${BASE_URL}/agent/requests`,
      method: "POST",
      body: { goal: GOAL, flowId: FLOW_ID },
    });
  });

  it("sends the request body as JSON", async () => {
    const { service, calls } = setup([{ status: 200, body: ANSWER_ONLY }]);

    await ask(service);

    expect(headerOf(calls[0], "content-type")).toMatch(/^application\/json/);
  });

  it("fetches the proposal with a GET after an answer that proposes changes", async () => {
    const { service, calls } = setup([
      { status: 200, body: ANSWER_WITH_PROPOSAL },
      { status: 200, body: PROPOSAL_REPLY },
    ]);

    await ask(service);

    expect({ url: calls[1]?.url, method: methodOf(calls[1]) }).toEqual({
      url: `${BASE_URL}/agent/proposals/${PROPOSAL_ID}`,
      method: "GET",
    });
  });

  it("makes a single call when the answer proposes nothing", async () => {
    const { service, calls } = setup([{ status: 200, body: ANSWER_ONLY }]);

    await ask(service);

    expect(calls.length).toBe(1);
  });

  it("sends the bearer token on the request and on the proposal fetch", async () => {
    const { service, calls } = setup([
      { status: 200, body: ANSWER_WITH_PROPOSAL },
      { status: 200, body: PROPOSAL_REPLY },
    ]);

    await ask(service);

    expect(calls.map((call) => headerOf(call, "authorization"))).toEqual([
      `Bearer ${TOKEN}`,
      `Bearer ${TOKEN}`,
    ]);
  });

  it("forwards the abort signal to the request", async () => {
    const { service, calls } = setup([{ status: 200, body: ANSWER_ONLY }]);
    const controller = new AbortController();

    await service.ask({ goal: GOAL, flowId: FLOW_ID }, controller.signal);

    expect(calls[0]?.init?.signal).toBe(controller.signal);
  });

  it("drops a trailing slash from the base URL", async () => {
    const { service, calls } = setup([{ status: 200, body: ANSWER_ONLY }], {
      baseUrl: `${BASE_URL}/`,
    });

    await ask(service);

    expect(calls[0]?.url).toBe(`${BASE_URL}/agent/requests`);
  });
});

describe("createHttpAgentService ask replies", () => {
  it("returns only the summary when the agent proposes nothing", async () => {
    const { service } = setup([{ status: 200, body: ANSWER_ONLY }]);

    const result = await ask(service);

    expect(result).toEqual({ ok: true, value: { summary: ANSWER_ONLY.summary } });
  });

  it("returns the proposal with its version, flow and the cards of the proposal fetch", async () => {
    const { service } = setup([
      { status: 200, body: ANSWER_WITH_PROPOSAL },
      { status: 200, body: PROPOSAL_REPLY },
    ]);

    const result = await ask(service);

    expect(result).toEqual({
      ok: true,
      value: {
        summary: ANSWER_WITH_PROPOSAL.summary,
        proposal: { id: PROPOSAL_ID, version: 7, flowId: FLOW_ID, cards: [CARD, OTHER_CARD] },
      },
    });
  });

  it("returns UNAVAILABLE when the answer has an unexpected shape", async () => {
    const { service } = setup([{ status: 200, body: { steps: 1 } }]);

    const result = await ask(service);

    expect(result).toEqual({ ok: false, error: { code: "UNAVAILABLE" } });
  });

  it("returns UNAVAILABLE when the proposal fetch has an unexpected shape", async () => {
    const { service } = setup([
      { status: 200, body: ANSWER_WITH_PROPOSAL },
      { status: 200, body: { proposal: { ...PROPOSAL, version: "7" }, cards: [] } },
    ]);

    const result = await ask(service);

    expect(result).toEqual({ ok: false, error: { code: "UNAVAILABLE" } });
  });

  it("returns UNAVAILABLE when a card of the proposal fetch has no reason", async () => {
    const { service } = setup([
      { status: 200, body: ANSWER_WITH_PROPOSAL },
      { status: 200, body: { proposal: PROPOSAL, cards: [{ changeId: "c", title: "t" }] } },
    ]);

    const result = await ask(service);

    expect(result).toEqual({ ok: false, error: { code: "UNAVAILABLE" } });
  });

  it("returns NOT_FOUND when the proposal fetch answers 404", async () => {
    const { service } = setup([
      { status: 200, body: ANSWER_WITH_PROPOSAL },
      { status: 404, body: { error: "not_found" } },
    ]);

    const result = await ask(service);

    expect(result).toEqual({ ok: false, error: { code: "NOT_FOUND" } });
  });

  it("returns UNAVAILABLE when the body is not JSON", async () => {
    const { service } = setup([{ status: 200, raw: "<html>oops</html>" }]);

    const result = await ask(service);

    expect(result).toEqual({ ok: false, error: { code: "UNAVAILABLE" } });
  });

  it("returns UNAVAILABLE on a network error", async () => {
    const { service } = setup([new TypeError("Failed to fetch")]);

    const result = await ask(service);

    expect(result).toEqual({ ok: false, error: { code: "UNAVAILABLE" } });
  });

  it.each([
    [400, "invalid_body", "INVALID"],
    [401, "unauthorized", "UNAUTHENTICATED"],
    [404, "not_found", "NOT_FOUND"],
    [429, "rate_limit_exceeded", "RATE_LIMITED"],
    [504, "timeout", "TIMEOUT"],
    [502, "upstream_unavailable", "UNAVAILABLE"],
    [500, "boom", "UNAVAILABLE"],
  ])("maps a %i %s reply to %s", async (status, error, code) => {
    const { service } = setup([{ status, body: { error } }]);

    const result = await ask(service);

    expect(result).toEqual({ ok: false, error: { code } });
  });
});

describe("createHttpAgentService decide", () => {
  it("posts the accepted ids and the version to the decision path", async () => {
    const { service, calls } = setup([{ status: 200, body: { ...PROPOSAL, status: "accepted" } }]);

    await service.decide(PROPOSAL_ID, { acceptedIds: ["change-1", "change-2"], version: 7 });

    expect({ url: calls[0]?.url, method: methodOf(calls[0]), body: bodyOf(calls[0]) }).toEqual({
      url: `${BASE_URL}/agent/proposals/${PROPOSAL_ID}/decision`,
      method: "POST",
      body: { acceptedIds: ["change-1", "change-2"], version: 7 },
    });
  });

  it("posts an empty list to reject every change", async () => {
    const { service, calls } = setup([{ status: 200, body: { ...PROPOSAL, status: "rejected" } }]);

    await service.decide(PROPOSAL_ID, { acceptedIds: [], version: 7 });

    expect(bodyOf(calls[0])).toEqual({ acceptedIds: [], version: 7 });
  });

  it("sends the bearer token", async () => {
    const { service, calls } = setup([{ status: 200, body: { ...PROPOSAL, status: "accepted" } }]);

    await decide(service);

    expect(headerOf(calls[0], "authorization")).toBe(`Bearer ${TOKEN}`);
  });

  it("returns the final status of the updated proposal", async () => {
    const { service } = setup([
      { status: 200, body: { ...PROPOSAL, status: "partially_accepted" } },
    ]);

    const result = await decide(service);

    expect(result).toEqual({ ok: true, value: { status: "partially_accepted" } });
  });

  it("returns UNAVAILABLE when the updated proposal has an unexpected shape", async () => {
    const { service } = setup([{ status: 200, body: { status: 3 } }]);

    const result = await decide(service);

    expect(result).toEqual({ ok: false, error: { code: "UNAVAILABLE" } });
  });

  it("returns STALE when the flow changed since the agent read it", async () => {
    const { service } = setup([{ status: 409, body: { error: "stale" } }]);

    const result = await decide(service);

    expect(result).toEqual({ ok: false, error: { code: "STALE" } });
  });

  it("returns UNAVAILABLE for a 409 version conflict", async () => {
    const { service } = setup([{ status: 409, body: { error: "version_conflict" } }]);

    const result = await decide(service);

    expect(result).toEqual({ ok: false, error: { code: "UNAVAILABLE" } });
  });

  it.each([
    [400, "invalid_change", "INVALID"],
    [401, "unauthorized", "UNAUTHENTICATED"],
    [404, "not_found", "NOT_FOUND"],
    [502, "upstream_failed", "UNAVAILABLE"],
  ])("maps a %i %s reply to %s", async (status, error, code) => {
    const { service } = setup([{ status, body: { error } }]);

    const result = await decide(service);

    expect(result).toEqual({ ok: false, error: { code } });
  });
});

describe("createHttpAgentService without a token", () => {
  it.each([
    ["ask", ask],
    ["decide", decide],
  ])("returns UNAUTHENTICATED from %s and never calls fetch", async (_name, call) => {
    const { service, calls } = setup([{ status: 200, body: ANSWER_ONLY }], { hasToken: false });

    const result = await call(service);

    expect({ result, calls: calls.length }).toEqual({
      result: { ok: false, error: { code: "UNAUTHENTICATED" } },
      calls: 0,
    });
  });
});
