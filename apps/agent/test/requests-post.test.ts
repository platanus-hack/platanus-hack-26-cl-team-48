import { once } from "node:events";
import { Duplex } from "node:stream";
import { err, ok, type Result } from "@nodomics/protocol";
import { describe, expect, it } from "vitest";
import type { LlmError, LlmPort, LlmRequest, LlmTurn } from "../src/llm/llm-port.ts";
import { createFakeMcp } from "../src/mcp/fake-mcp.ts";
import type { McpError, McpPort } from "../src/mcp/mcp-port.ts";
import { createHandleRequest, type RequestDeps } from "../src/requests/handle-request.ts";
import { createDevIdentity } from "../src/requests/identity.ts";
import type { IdentityPort } from "../src/requests/identity.ts";
import { createServer } from "../src/server.ts";

const USER = { userId: "u1", accessToken: "jwt-u1" };
const rejectingIdentity: IdentityPort = {
  resolve: (bearer) =>
    Promise.resolve(
      bearer === USER.accessToken
        ? ok(USER)
        : err({ code: "UNAUTHORIZED" as const, message: "Invalid token" }),
    ),
};

const createDraft = (): LlmTurn => ({
  kind: "tool_calls",
  calls: [{ id: "c1", name: "flows.create_draft", args: {} }],
});
const finish = (text: string): LlmTurn => ({ kind: "text", text });

function scriptedLlm(turns: readonly LlmTurn[]) {
  const requests: LlmRequest[] = [];
  const llm: LlmPort = {
    complete: (request) => {
      requests.push(request);
      const turn = turns[requests.length - 1];
      const result: Result<LlmTurn, LlmError> = turn
        ? ok(turn)
        : err({ code: "API_ERROR", message: "script exhausted" });
      return Promise.resolve(result);
    },
  };
  return { llm, requests };
}

const neverLlm: LlmPort = { complete: () => new Promise(() => undefined) };

type Reply = { status: number; headers: string; body: unknown };

async function post(deps: RequestDeps, init: { body: string; authorization?: string }) {
  const chunks: Buffer[] = [];
  const socket = new Duplex({
    read() {},
    write(chunk: Buffer, _encoding, done) {
      chunks.push(chunk);
      done();
    },
  });
  const completed = once(socket, "finish");
  createServer({ handleRequest: createHandleRequest(deps) }).emit("connection", socket);
  const auth = init.authorization ? `Authorization: ${init.authorization}\r\n` : "";
  socket.push(
    `POST /agent/requests HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n${auth}` +
      `Content-Type: application/json\r\nContent-Length: ${String(Buffer.byteLength(init.body))}\r\n\r\n${init.body}`,
  );
  await completed;
  const raw = Buffer.concat(chunks).toString();
  const [headers = "", text = ""] = raw.split("\r\n\r\n");
  return { status: Number(/^HTTP\/1\.1 (\d+)/.exec(headers)?.[1]), headers, body: JSON.parse(text) as unknown } satisfies Reply;
}

const authed = (body: unknown) => ({
  body: JSON.stringify(body),
  authorization: `Bearer ${USER.accessToken}`,
});

function depsWith(turns: readonly LlmTurn[], mcp: McpPort = createFakeMcp()) {
  const { llm, requests } = scriptedLlm(turns);
  return { deps: { identity: rejectingIdentity, llm, mcp } satisfies RequestDeps, requests };
}

describe("POST /agent/requests", () => {
  it("post request runs loop and returns summary", async () => {
    const { deps, requests } = depsWith([createDraft(), finish("Listo, borrador creado")]);

    const reply = await post(deps, authed({ goal: "hazme una calculadora de cosecha" }));

    expect(reply.status).toBe(200);
    expect(reply.body).toEqual({ draftId: "draft-1", summary: "Listo, borrador creado", steps: 2 });
    expect(requests[0]?.messages[0]).toMatchObject({ text: "hazme una calculadora de cosecha" });
    expect(requests[0]?.tools.map((tool) => tool.name)).not.toContain("flows.apply");
  });

  it("omits draftId when no draft was created", async () => {
    const { deps } = depsWith([finish("No hace falta nada")]);

    const reply = await post(deps, authed({ goal: "hola" }));

    expect(reply.body).toEqual({ summary: "No hace falta nada", steps: 1 });
  });

  it("tells the model which flow to start from", async () => {
    const { deps, requests } = depsWith([finish("ok")]);

    await post(deps, authed({ goal: "cambia el filtro", flowId: "flow-9" }));

    expect(requests[0]?.messages[0]).toMatchObject({ text: expect.stringContaining("flow-9") });
  });

  it.each([
    ["empty goal", { goal: "" }],
    ["missing goal", {}],
    ["goal too long", { goal: "x".repeat(2001) }],
    ["wrong flowId type", { goal: "hola", flowId: 3 }],
    ["not an object", "hola"],
  ])("invalid body is 400: %s", async (_name, body) => {
    const { deps } = depsWith([]);

    const reply = await post(deps, authed(body));

    expect(reply.status).toBe(400);
    expect(reply.body).toEqual({ error: "invalid_body" });
  });

  it("malformed json is 400", async () => {
    const { deps } = depsWith([]);

    const reply = await post(deps, { ...authed({}), body: "{nope" });

    expect(reply.status).toBe(400);
  });

  it("unauthorized is 401", async () => {
    const { deps, requests } = depsWith([finish("x")]);

    const missing = await post(deps, { body: JSON.stringify({ goal: "hola" }) });
    const invalid = await post(deps, { body: JSON.stringify({ goal: "hola" }), authorization: "Bearer other" });

    expect([missing.status, invalid.status]).toEqual([401, 401]);
    expect(missing.body).toEqual({ error: "unauthorized" });
    expect(requests).toHaveLength(0);
  });

  it("loop timeout is 504", async () => {
    const deps: RequestDeps = {
      identity: rejectingIdentity,
      llm: neverLlm,
      mcp: createFakeMcp(),
      limits: { maxSteps: 5, timeoutMs: 20 },
    };

    const reply = await post(deps, authed({ goal: "hola" }));

    expect(reply.status).toBe(504);
    expect(reply.body).toEqual({ error: "timeout" });
  });

  it("an unavailable llm is 502 without leaking details", async () => {
    const llm: LlmPort = {
      complete: () => Promise.resolve(err({ code: "NETWORK", message: "secret-host:443 refused" })),
    };

    const reply = await post({ identity: rejectingIdentity, llm, mcp: createFakeMcp() }, authed({ goal: "hola" }));

    expect(reply.status).toBe(502);
    expect(JSON.stringify(reply.body)).not.toContain("secret-host");
  });

  it("an unavailable mcp is 502 without leaking details", async () => {
    const failure: McpError = { code: "UNAVAILABLE", message: "10.0.0.5 unreachable" };
    const mcp: McpPort = { listTools: () => Promise.resolve(err(failure)), call: () => Promise.resolve(err(failure)) };
    const { deps } = depsWith([], mcp);

    const reply = await post(deps, authed({ goal: "hola" }));

    expect(reply.status).toBe(502);
    expect(JSON.stringify(reply.body)).not.toContain("10.0.0.5");
  });

  it("an unavailable auth service is 502", async () => {
    const identity: IdentityPort = {
      resolve: () => Promise.resolve(err({ code: "UNAVAILABLE", message: "down" })),
    };

    const reply = await post({ ...depsWith([]).deps, identity }, authed({ goal: "hola" }));

    expect(reply.status).toBe(502);
  });

  it("the dev identity needs no bearer", async () => {
    const { deps } = depsWith([finish("ok")]);

    const reply = await post({ ...deps, identity: createDevIdentity() }, { body: JSON.stringify({ goal: "hola" }) });

    expect(reply.status).toBe(200);
  });
});
