import { once } from "node:events";
import { Duplex } from "node:stream";
import { err, ok, type Result } from "@nodomics/protocol";
import { describe, expect, it } from "vitest";
import type { StructuredLogger } from "../src/http/guards/logger.ts";
import type { LlmError, LlmPort, LlmTurn } from "../src/llm/llm-port.ts";
import { createFakeMcp } from "../src/mcp/fake-mcp.ts";
import type { McpPort, UserIdentity } from "../src/mcp/mcp-port.ts";
import { createFakeProposalStore } from "../src/proposals/fake-proposal-store.ts";
import { recordDrafts } from "../src/requests/draft-recorder.ts";
import { createHandleRequest, type RequestDeps } from "../src/requests/handle-request.ts";
import type { IdentityPort } from "../src/requests/identity.ts";
import { createServer } from "../src/server.ts";

const USER = { userId: "u1", accessToken: "jwt-secret-token-u1" };
const identity: IdentityPort = {
  resolve: (bearer) =>
    Promise.resolve(
      bearer === USER.accessToken
        ? ok(USER)
        : err({ code: "UNAUTHORIZED" as const, message: "Invalid token" }),
    ),
};
const IDENTITY: UserIdentity = USER;

type LogCall = { level: string; message: string; data: Record<string, unknown> | undefined };

function recordingLogger() {
  const calls: LogCall[] = [];
  const at =
    (level: string) =>
    (message: string, data?: Record<string, unknown>): string => {
      calls.push({ level, message, data });
      return "";
    };
  const logger: StructuredLogger = {
    log: (level, message, data) => at(level)(message, data),
    debug: at("debug"),
    info: at("info"),
    warn: at("warn"),
    error: at("error"),
  };
  return { logger, calls };
}

const createDraft = (): LlmTurn => ({
  kind: "tool_calls",
  calls: [{ id: "c1", name: "flows.create_draft", args: {} }],
});
const addNode = (): LlmTurn => ({
  kind: "tool_calls",
  calls: [
    {
      id: "c2",
      name: "flows.add_node",
      args: { draftId: "draft-1", type: "data.source", nodeId: "src" },
    },
  ],
});
const finish = (text: string): LlmTurn => ({ kind: "text", text });

function scriptedLlm(turns: readonly LlmTurn[]): LlmPort {
  let index = 0;
  return {
    complete: () => {
      const turn = turns[index];
      index += 1;
      const result: Result<LlmTurn, LlmError> = turn
        ? ok(turn)
        : err({ code: "API_ERROR", message: "script exhausted" });
      return Promise.resolve(result);
    },
  };
}

const slowLlm: LlmPort = { complete: () => new Promise(() => undefined) };

async function post(deps: RequestDeps, body: unknown) {
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
  const text = JSON.stringify(body);
  socket.push(
    `POST /agent/requests HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n` +
      `Authorization: Bearer ${USER.accessToken}\r\n` +
      `Content-Type: application/json\r\nContent-Length: ${String(Buffer.byteLength(text))}\r\n\r\n${text}`,
  );
  await completed;
  const raw = Buffer.concat(chunks).toString();
  const [headers = "", payload = ""] = raw.split("\r\n\r\n");
  return {
    status: Number(/^HTTP\/1\.1 (\d+)/.exec(headers)?.[1]),
    body: JSON.parse(payload) as Record<string, unknown>,
  };
}

const failingDiff = (inner: McpPort): McpPort => ({
  listTools: inner.listTools,
  call: (name, args, who) =>
    name === "flows.diff"
      ? Promise.resolve(err({ code: "TOOL_FAILED" as const, message: "diff exploded" }))
      : inner.call(name, args, who),
});

const proposalTurns = (): readonly LlmTurn[] => [
  createDraft(),
  addNode(),
  finish("Listo"),
  finish(JSON.stringify({ "add_node:src": "Fuente" })),
];

describe("request diagnostics", () => {
  it("logs the loop error code and message when the loop fails upstream", async () => {
    const { logger, calls } = recordingLogger();
    const llm: LlmPort = {
      complete: () => Promise.resolve(err({ code: "NETWORK", message: "upstream refused" })),
    };

    const reply = await post({ identity, llm, mcp: createFakeMcp(), logger }, { goal: "hola" });

    expect(reply.status).toBe(502);
    expect(reply.body).toEqual({ error: "upstream_unavailable" });
    const errors = calls.filter((call) => call.level === "error");
    expect(errors).toHaveLength(1);
    expect(errors[0]?.message).toBe("agent loop failed");
    expect(String(errors[0]?.data?.["message"])).toContain("upstream refused");
    expect(typeof errors[0]?.data?.["code"]).toBe("string");
    expect(errors[0]?.data?.["code"]).not.toBe("timeout");
  });

  it("logs the timeout when the loop runs out of time", async () => {
    const { logger, calls } = recordingLogger();
    const deps: RequestDeps = {
      identity,
      llm: slowLlm,
      mcp: createFakeMcp(),
      limits: { maxSteps: 5, timeoutMs: 20 },
      logger,
    };

    const reply = await post(deps, { goal: "hola" });

    expect(reply.status).toBe(504);
    expect(reply.body).toEqual({ error: "timeout" });
    const errors = calls.filter((call) => call.level === "error");
    expect(errors).toHaveLength(1);
    expect(errors[0]?.message).toBe("agent loop failed");
    expect(errors[0]?.data?.["code"]).toBe("timeout");
    expect(typeof errors[0]?.data?.["message"]).toBe("string");
  });

  it("logs when the proposal cannot be built and still replies 200", async () => {
    const { logger, calls } = recordingLogger();
    const deps: RequestDeps = {
      identity,
      llm: scriptedLlm(proposalTurns()),
      mcp: failingDiff(createFakeMcp()),
      proposals: createFakeProposalStore(),
      logger,
    };

    const reply = await post(deps, { goal: "agrega nodo fuente" });

    expect(reply.status).toBe(200);
    expect(reply.body["proposalId"]).toBeUndefined();
    expect(reply.body["summary"]).toContain("Listo");
    expect(reply.body["summary"]).toMatch(/propuesta/i);
    const warns = calls.filter((call) => call.level === "warn");
    expect(warns).toHaveLength(1);
    expect(warns[0]?.message).toBe("proposal not built");
    expect(warns[0]?.data).toHaveProperty("code");
    expect(warns[0]?.data).toHaveProperty("message");
  });

  it("keeps the summary and reports a proposal that could not be stored", async () => {
    const deps: RequestDeps = {
      identity,
      llm: scriptedLlm(proposalTurns()),
      mcp: createFakeMcp(),
      proposals: {
        ...createFakeProposalStore(),
        save: () => Promise.resolve(err({ code: "STORE_FAILED", message: "permission denied" })),
      },
    };

    const reply = await post(deps, { goal: "agrega nodo fuente" });

    expect(reply.status).toBe(200);
    expect(reply.body["summary"]).toContain("Listo");
    expect(reply.body["summary"]).toMatch(/propuesta/i);
    expect(reply.body["proposalId"]).toBeUndefined();
  });

  it("never logs the access token", async () => {
    const { logger, calls } = recordingLogger();
    const failingLlm: LlmPort = {
      complete: () => Promise.resolve(err({ code: "NETWORK", message: "boom" })),
    };
    const upstream: RequestDeps = { identity, llm: failingLlm, mcp: createFakeMcp(), logger };
    const noProposal: RequestDeps = {
      identity,
      llm: scriptedLlm(proposalTurns()),
      mcp: failingDiff(createFakeMcp()),
      proposals: createFakeProposalStore(),
      logger,
    };

    await post(upstream, { goal: "hola" });
    await post(noProposal, { goal: "hola" });

    expect(calls.length).toBeGreaterThan(0);
    const serialized = JSON.stringify(calls);
    expect(serialized).not.toContain(USER.accessToken);
    expect(serialized).not.toContain("Bearer");
  });

  it("works without a logger", async () => {
    const llm: LlmPort = {
      complete: () => Promise.resolve(err({ code: "NETWORK", message: "boom" })),
    };

    const reply = await post({ identity, llm, mcp: createFakeMcp() }, { goal: "hola" });

    expect(reply.status).toBe(502);
    expect(reply.body).toEqual({ error: "upstream_unavailable" });
  });
});

describe("recordDrafts lastFlowId", () => {
  it("lastFlowId returns the flowId from the latest create_draft reply", async () => {
    const recorder = recordDrafts(createFakeMcp());

    await recorder.mcp.call("flows.create_draft", { flowId: undefined }, IDENTITY);
    const second = await recorder.mcp.call("flows.create_draft", {}, IDENTITY);

    const reply = second.ok ? (second.value as { flowId: string }) : undefined;
    expect(reply?.flowId).toEqual(expect.any(String));
    expect(recorder.lastFlowId()).toBe(reply?.flowId);
  });

  it("lastFlowId is undefined before any draft", () => {
    const recorder = recordDrafts(createFakeMcp());

    expect(recorder.lastFlowId()).toBeUndefined();
  });
});

describe("proposal flowId", () => {
  it("uses the draft's flowId for the proposal when the request has none", async () => {
    const proposals = createFakeProposalStore();
    const deps: RequestDeps = {
      identity,
      llm: scriptedLlm(proposalTurns()),
      mcp: createFakeMcp(),
      proposals,
    };

    const reply = await post(deps, { goal: "agrega nodo fuente" });

    const saved = await proposals.get(String(reply.body["proposalId"]), USER.userId);
    expect(saved.ok && saved.value.proposal.flowId).toBe("flow-1");
    expect(reply.body["draftId"]).toBe("draft-1");
  });

  it("keeps the request flowId for the proposal when given", async () => {
    const proposals = createFakeProposalStore();
    const deps: RequestDeps = {
      identity,
      llm: scriptedLlm(proposalTurns()),
      mcp: createFakeMcp(),
      proposals,
    };

    const reply = await post(deps, { goal: "agrega nodo fuente", flowId: "flow-1" });

    const saved = await proposals.get(String(reply.body["proposalId"]), USER.userId);
    expect(saved.ok && saved.value.proposal.flowId).toBe("flow-1");
  });
});
