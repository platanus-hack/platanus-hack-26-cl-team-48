import { once } from "node:events";
import { Duplex } from "node:stream";
import { expect, it } from "vitest";
import { createServer } from "../src/server.ts";

async function request(
  method: string,
  path: string,
  options?: {
    readonly headers?: Record<string, string>;
    readonly body?: string;
    readonly server?: ReturnType<typeof createServer>;
  },
): Promise<string> {
  const chunks: Buffer[] = [];
  const socket = new Duplex({
    read() {},
    write(chunk: Buffer, _encoding, done) {
      chunks.push(chunk);
      done();
    },
  });
  const completed = once(socket, "finish");
  const server =
    options?.server ??
    createServer({
      handleRequest: () => Promise.resolve({ status: 200, body: { ok: true } }),
    });
  server.emit("connection", socket);

  const headerLines = Object.entries(options?.headers ?? {})
    .map(([k, v]) => `${k}: ${v}\r\n`)
    .join("");
  const body = options?.body ?? "";
  const lengthHeader = body ? `Content-Length: ${String(Buffer.byteLength(body))}\r\n` : "";

  socket.push(
    `${method} ${path} HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n${headerLines}${lengthHeader}\r\n${body}`,
  );
  await completed;
  return Buffer.concat(chunks).toString();
}

it('GET /health returns 200 {status:"ok"}', async () => {
  const response = await request("GET", "/health");

  expect(response).toMatch(/^HTTP\/1\.1 200 /);
  expect(response).toMatch(/\r\nContent-Type: application\/json\r\n/i);
  expect(response.split("\r\n\r\n")[1]).toBe('{"status":"ok"}');
});

it("unknown route returns 404", async () => {
  const response = await request("GET", "/unknown");

  expect(response).toMatch(/^HTTP\/1\.1 404 /);
  expect(response).toMatch(/\r\nContent-Type: application\/json\r\n/i);
  expect(response.split("\r\n\r\n")[1]).toBe('{"error":"not_found"}');
});

it("a different HTTP method cannot use the health route", async () => {
  expect(await request("POST", "/health")).toMatch(/^HTTP\/1\.1 404 /);
});

it("seventh request in a minute is 429", async () => {
  const server = createServer({
    handleRequest: () => Promise.resolve({ status: 200, body: { ok: true } }),
  });
  const headers = { Authorization: "Bearer user-token-123" };

  for (let i = 0; i < 6; i++) {
    const res = await request("POST", "/agent/requests", { server, headers, body: "{}" });
    expect(res).toMatch(/^HTTP\/1\.1 200 /);
  }

  const seventh = await request("POST", "/agent/requests", { server, headers, body: "{}" });
  expect(seventh).toMatch(/^HTTP\/1\.1 429 /);
});

it("preflight from allowed origin succeeds", async () => {
  const previous = process.env["AGENT_ALLOWED_ORIGINS"];
  process.env["AGENT_ALLOWED_ORIGINS"] = "https://app.nodomics.com";
  try {
    const server = createServer({
      handleRequest: () => Promise.resolve({ status: 200, body: { ok: true } }),
    });

    const response = await request("OPTIONS", "/agent/requests", {
      server,
      headers: { Origin: "https://app.nodomics.com" },
    });

    expect(response).toMatch(/^HTTP\/1\.1 204 /);
    expect(response).toContain("Access-Control-Allow-Origin: https://app.nodomics.com");
  } finally {
    process.env["AGENT_ALLOWED_ORIGINS"] = previous;
  }
});
