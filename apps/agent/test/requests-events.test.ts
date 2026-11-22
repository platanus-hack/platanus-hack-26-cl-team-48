import { err, ok, type Result } from "@nodomics/protocol";
import { describe, expect, it } from "vitest";
import type { LlmError, LlmPort, LlmTurn } from "../src/llm/llm-port.ts";
import type { AgentEvent } from "../src/loop/agent-loop.ts";
import { createFakeMcp } from "../src/mcp/fake-mcp.ts";
import { createHandleRequest } from "../src/requests/handle-request.ts";
import type { IdentityPort } from "../src/requests/identity.ts";

const USER = { userId: "u1", accessToken: "jwt-u1" };
const identity: IdentityPort = {
  resolve: (bearer) =>
    Promise.resolve(
      bearer === USER.accessToken
        ? ok(USER)
        : err({ code: "UNAUTHORIZED" as const, message: "Invalid token" }),
    ),
};

/** Answers with a final text, speaking it in two deltas when asked to. */
const talkingLlm: LlmPort = {
  complete: (request) => {
    request.onTextDelta?.("No hace ");
    request.onTextDelta?.("falta nada");
    const result: Result<LlmTurn, LlmError> = ok({ kind: "text", text: "No hace falta nada" });
    return Promise.resolve(result);
  },
};

const handle = createHandleRequest({ identity, llm: talkingLlm, mcp: createFakeMcp() });
const GOAL = JSON.stringify({ goal: "hola" });

describe("createHandleRequest events", () => {
  it("passes the loop events to the caller", async () => {
    const events: AgentEvent[] = [];

    await handle({
      authorization: `Bearer ${USER.accessToken}`,
      rawBody: GOAL,
      onEvent: (event) => events.push(event),
    });

    expect(events).toEqual([
      { type: "text", delta: "No hace " },
      { type: "text", delta: "falta nada" },
    ]);
  });

  it("keeps the same reply when the caller listens for events", async () => {
    const reply = await handle({
      authorization: `Bearer ${USER.accessToken}`,
      rawBody: GOAL,
      onEvent: () => undefined,
    });

    expect(reply).toEqual({ status: 200, body: { summary: "No hace falta nada", steps: 1 } });
  });

  it("emits no events when the request is rejected before the model runs", async () => {
    const events: AgentEvent[] = [];

    const reply = await handle({
      authorization: "Bearer someone-else",
      rawBody: GOAL,
      onEvent: (event) => events.push(event),
    });

    expect(reply.status).toBe(401);
    expect(events).toEqual([]);
  });
});
