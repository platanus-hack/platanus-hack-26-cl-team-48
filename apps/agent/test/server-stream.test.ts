import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { createCorsGuard } from "../src/http/guards/cors.ts";
import type { AgentEvent } from "../src/loop/agent-loop.ts";
import type { HttpReply, RequestInput } from "../src/requests/handle-request.ts";
import { createServer, type ServerDeps } from "../src/server.ts";

const NDJSON = "application/x-ndjson";
const ALLOWED_ORIGIN = "https://app.nodomics.com";
const EVENTS: readonly AgentEvent[] = [
  { type: "text", delta: "Voy a " },
  { type: "text", delta: "mirar el flujo" },
  { type: "tool", name: "flows.get" },
  { type: "step" },
  { type: "text", delta: "Listo" },
];
const DONE_REPLY: HttpReply = { status: 200, body: { summary: "Listo", steps: 2 } };

type Handler = (input: RequestInput) => Promise<HttpReply>;

const emitting =
  (events: readonly AgentEvent[], reply: HttpReply): Handler =>
  async (input) => {
    await Promise.resolve();
    for (const event of events) input.onEvent?.(event);
    return reply;
  };

const silent =
  (reply: HttpReply): Handler =>
  () =>
    Promise.resolve(reply);

const servers: ReturnType<typeof createServer>[] = [];
const pendingReleases: (() => void)[] = [];

afterEach(async () => {
  for (const release of pendingReleases.splice(0)) release();
  await Promise.all(
    servers.splice(0).map((server) => {
      server.closeAllConnections();
      return new Promise((resolve) => server.close(resolve));
    }),
  );
});

async function startServer(deps: ServerDeps): Promise<string> {
  const server = createServer(deps);
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return `http://127.0.0.1:${String(port)}`;
}

async function postGoal(base: string, headers: Record<string, string> = {}): Promise<Response> {
  return fetch(`${base}/agent/requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer jwt", ...headers },
    body: JSON.stringify({ goal: "hola" }),
  });
}

const parseLines = (text: string): unknown[] =>
  text
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => JSON.parse(line) as unknown);

async function readUntilFirstLine(response: Response): Promise<string> {
  const chunks = (response.body ?? []) as unknown as AsyncIterable<Uint8Array>;
  const decoder = new TextDecoder();
  let received = "";
  for await (const chunk of chunks) {
    received += decoder.decode(chunk, { stream: true });
    if (received.includes("\n")) break;
  }
  return received;
}

describe("POST /agent/requests streaming", () => {
  it("writes each event as an NDJSON line followed by a done line", async () => {
    const base = await startServer({ handleRequest: emitting(EVENTS, DONE_REPLY) });

    const response = await postGoal(base, { Accept: NDJSON });

    expect(response.status).toBe(200);
    expect(parseLines(await response.text())).toEqual([
      ...EVENTS,
      { type: "done", status: 200, body: { summary: "Listo", steps: 2 } },
    ]);
  });

  it("sends the streaming headers", async () => {
    const base = await startServer({ handleRequest: emitting(EVENTS, DONE_REPLY) });

    const response = await postGoal(base, { Accept: NDJSON });

    expect(response.headers.get("content-type")).toBe("application/x-ndjson; charset=utf-8");
    expect(response.headers.get("cache-control")).toBe("no-cache");
    expect(response.headers.get("x-accel-buffering")).toBe("no");
  });

  it("carries the reply status in the done line when the stream already started", async () => {
    const base = await startServer({
      handleRequest: emitting([{ type: "text", delta: "Pensando" }], {
        status: 504,
        body: { error: "timeout" },
      }),
    });

    const response = await postGoal(base, { Accept: NDJSON });

    expect(response.status).toBe(200);
    expect(parseLines(await response.text())).toEqual([
      { type: "text", delta: "Pensando" },
      { type: "done", status: 504, body: { error: "timeout" } },
    ]);
  });

  it("streams when the Accept header lists ndjson among other types", async () => {
    const base = await startServer({ handleRequest: emitting(EVENTS, DONE_REPLY) });

    const response = await postGoal(base, { Accept: `${NDJSON}, application/json` });

    expect(response.headers.get("content-type")).toBe("application/x-ndjson; charset=utf-8");
  });

  it("sends an event before the request has finished", async () => {
    const finished = new Promise<void>((resolve) => pendingReleases.push(resolve));
    const base = await startServer({
      handleRequest: async (input) => {
        input.onEvent?.({ type: "text", delta: "Hola" });
        await finished;
        return DONE_REPLY;
      },
    });

    const response = await postGoal(base, { Accept: NDJSON });
    const firstLine = await readUntilFirstLine(response);

    expect(parseLines(firstLine)).toEqual([{ type: "text", delta: "Hola" }]);
  });

  it("answers with plain JSON and its status when no event was emitted", async () => {
    const base = await startServer({
      handleRequest: silent({ status: 401, body: { error: "unauthorized" } }),
    });

    const response = await postGoal(base, { Accept: NDJSON });

    expect(response.status).toBe(401);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(await response.json()).toEqual({ error: "unauthorized" });
  });

  it("answers with plain JSON when the client does not accept ndjson", async () => {
    const base = await startServer({ handleRequest: emitting(EVENTS, DONE_REPLY) });

    const response = await postGoal(base);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(await response.json()).toEqual({ summary: "Listo", steps: 2 });
  });

  it("keeps the CORS headers on a streamed response", async () => {
    const base = await startServer({
      handleRequest: emitting(EVENTS, DONE_REPLY),
      cors: createCorsGuard({ allowedOrigins: ALLOWED_ORIGIN }),
    });

    const response = await postGoal(base, { Accept: NDJSON, Origin: ALLOWED_ORIGIN });

    expect(response.headers.get("content-type")).toBe("application/x-ndjson; charset=utf-8");
    expect(response.headers.get("access-control-allow-origin")).toBe(ALLOWED_ORIGIN);
  });
});
