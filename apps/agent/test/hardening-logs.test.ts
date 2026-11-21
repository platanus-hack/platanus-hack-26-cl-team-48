import { once } from "node:events";
import { Duplex } from "node:stream";
import { ok } from "@nodomics/protocol";
import { describe, expect, it } from "vitest";
import type { LogLevel, StructuredLogger } from "../src/http/guards/logger.ts";
import { createStructuredLogger } from "../src/http/guards/logger.ts";
import type { Route } from "../src/http/route.ts";
import { createRouter } from "../src/http/router.ts";
import { createServer } from "../src/server.ts";

type Entry = {
  readonly level: LogLevel;
  readonly message: string;
  readonly data: Record<string, unknown> | undefined;
};

function capturingLogger() {
  const entries: Entry[] = [];
  const record =
    (level: LogLevel) =>
    (message: string, data?: Record<string, unknown>): string => {
      entries.push({ level, message, data });
      return "";
    };
  const logger: StructuredLogger = {
    log: (level, message, data) => record(level)(message, data),
    debug: record("debug"),
    info: record("info"),
    warn: record("warn"),
    error: record("error"),
  };
  return { logger, entries };
}

const searchRoute: Route = {
  method: "GET",
  path: "/agent/search",
  handle: () => Promise.resolve({ status: 200, body: { hits: [] } }),
};

function buildServer(logger: StructuredLogger) {
  const router = createRouter({
    identity: { resolve: () => Promise.resolve(ok({ userId: "u1", accessToken: "jwt" })) },
    routes: [searchRoute],
  });
  return createServer({
    handleRequest: () => Promise.resolve({ status: 200, body: { ok: true } }),
    router,
    logger,
  });
}

async function send(server: ReturnType<typeof createServer>, method: string, target: string) {
  const socket = new Duplex({
    read() {},
    write: (_chunk, _encoding, done) => {
      done();
    },
  });
  const completed = once(socket, "finish");
  server.emit("connection", socket);
  socket.push(
    `${method} ${target} HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\nAuthorization: Bearer jwt\r\n\r\n`,
  );
  await completed;
}

describe("request logging", () => {
  it("never logs the query string text", async () => {
    const { logger, entries } = capturingLogger();

    await send(buildServer(logger), "GET", "/agent/search?q=secreto");

    expect(entries.length).toBeGreaterThan(0);
    expect(JSON.stringify(entries)).not.toContain("secreto");
  });

  it("never logs the query string text on unmatched routes", async () => {
    const { logger, entries } = capturingLogger();

    await send(buildServer(logger), "GET", "/nada?q=secreto");

    expect(JSON.stringify(entries)).not.toContain("secreto");
  });

  it("never emits the query string text through the real structured logger", async () => {
    const lines: string[] = [];
    const logger = createStructuredLogger({
      output: (line) => {
        lines.push(line);
      },
    });

    await send(buildServer(logger), "GET", "/agent/search?q=secreto&k=5");

    expect(lines.length).toBeGreaterThan(0);
    expect(lines.join("\n")).not.toContain("secreto");
  });

  it("logs method, path without query, and status", async () => {
    const { logger, entries } = capturingLogger();

    await send(buildServer(logger), "GET", "/agent/search?q=secreto");

    expect(entries.map((entry) => entry.data)).toContainEqual(
      expect.objectContaining({ method: "GET", path: "/agent/search", status: 200 }),
    );
  });

  it("logs the status of unmatched routes", async () => {
    const { logger, entries } = capturingLogger();

    await send(buildServer(logger), "GET", "/nada?q=secreto");

    expect(entries.map((entry) => entry.data)).toContainEqual(
      expect.objectContaining({ method: "GET", path: "/nada", status: 404 }),
    );
  });

  it("keeps the query separator out of every logged path", async () => {
    const { logger, entries } = capturingLogger();

    await send(buildServer(logger), "GET", "/agent/search?q=secreto");

    const paths = entries
      .map((entry) => entry.data?.["path"])
      .filter((path): path is string => typeof path === "string");
    expect(paths.length).toBeGreaterThan(0);
    for (const path of paths) expect(path).not.toContain("?");
  });
});
