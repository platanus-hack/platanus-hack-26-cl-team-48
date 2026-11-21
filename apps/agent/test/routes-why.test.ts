import { err, ok } from "@nodomics/protocol";
import { expect, it } from "vitest";
import { createWhyRoute } from "../src/http/routes/why.ts";
import type { RouteRequest } from "../src/http/route.ts";
import type { LlmPort } from "../src/llm/llm-port.ts";
import { createFakeMemory } from "../src/memory/fake-memory.ts";

const IDENTITY = { userId: "u1", accessToken: "jwt" };
const textLlm = (text: string): LlmPort => ({
  complete: () => Promise.resolve(ok({ kind: "text" as const, text })),
});

async function route(llm: LlmPort, actorId = "u1") {
  const memory = createFakeMemory();
  await memory.recordEpisode({
    id: "e1",
    at: "2026-11-20T10:00:00Z",
    actorId,
    kind: "mcp_call",
    entityIds: ["node-1"],
    payload: {},
  });
  return createWhyRoute({ memory, llm });
}

const request = (query: Record<string, string>): RouteRequest => ({
  params: { id: "node-1" },
  query,
  identity: IDENTITY,
  rawBody: "",
});

it("declares GET /agent/components/:id/why", async () => {
  const why = await route(textLlm("x"));

  expect([why.method, why.path]).toEqual(["GET", "/agent/components/:id/why"]);
});

it("why returns 200 with a cited answer", async () => {
  const why = await route(textLlm("Se creó el nodo [e1]."));

  expect(await why.handle(request({ q: "por que" }))).toEqual({
    status: 200,
    body: { answer: "Se creó el nodo [e1].", citations: ["e1"] },
  });
});

it.each([{}, { q: "" }, { q: "x".repeat(501) }])(
  "why without a valid q is 400 %j",
  async (query) => {
    const why = await route(textLlm("x"));

    expect((await why.handle(request(query))).status).toBe(400);
  },
);

it("why is 404 when the user has no history for the component", async () => {
  const why = await route(textLlm("x"), "u2");

  expect(await why.handle(request({ q: "por que" }))).toEqual({
    status: 404,
    body: { error: "not_found" },
  });
});

it("why is 502 without leaking details when the llm fails", async () => {
  const llm: LlmPort = {
    complete: () => Promise.resolve(err({ code: "NETWORK", message: "secret-host" })),
  };
  const why = await route(llm);

  const reply = await why.handle(request({ q: "por que" }));

  expect(reply.status).toBe(502);
  expect(JSON.stringify(reply.body)).not.toContain("secret-host");
});
