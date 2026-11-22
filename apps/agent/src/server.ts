import {
  createServer as createHttpServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import { createCorsGuard, type CorsGuard } from "./http/guards/cors.ts";
import { createStructuredLogger, type StructuredLogger } from "./http/guards/logger.ts";
import { MAX_BODY_BYTES, UPLOAD_MAX_BODY_BYTES } from "./http/guards/body-limit.ts";
import type { Router } from "./http/router.ts";
import type { HttpReply, RequestInput } from "./requests/handle-request.ts";

export type ServerDeps = {
  readonly handleRequest: (input: RequestInput) => Promise<HttpReply>;
  readonly router?: Router;
  readonly cors?: CorsGuard;
  readonly logger?: StructuredLogger;
};

const HTTP_OK = 200;
const HTTP_BAD_REQUEST = 400;
const HTTP_NOT_FOUND = 404;
const HTTP_INTERNAL_ERROR = 500;
const REQUESTS_PATH = "/agent/requests";

const pathOf = (request: IncomingMessage): string | undefined => request.url?.split("?", 1)[0];

const isRoute = (request: IncomingMessage, method: string, path: string): boolean =>
  request.method === method && pathOf(request) === path;

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(body));
}

async function readBody(
  request: IncomingMessage,
  maxBytes = MAX_BODY_BYTES,
): Promise<string | undefined> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.from(chunk as Uint8Array);
    size += buffer.length;
    if (size > maxBytes) return undefined;
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function serveRequests(
  deps: ServerDeps,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  const rawBody = await readBody(request);
  if (rawBody === undefined) {
    sendJson(response, HTTP_BAD_REQUEST, { error: "invalid_body" });
    return;
  }
  const reply = await deps.handleRequest({ authorization: request.headers.authorization, rawBody });
  sendJson(response, reply.status, reply.body);
}

function routerBodyLimit(router: Router, request: IncomingMessage): number {
  if (router.maxBodyBytes) {
    return router.maxBodyBytes(request.method ?? "", request.url ?? "");
  }
  const url = request.url ?? "";
  return url.includes("register") || url.includes("upload")
    ? UPLOAD_MAX_BODY_BYTES
    : MAX_BODY_BYTES;
}

async function serveRouter(
  router: Router,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  const rawBody = await readBody(request, routerBodyLimit(router, request));
  if (rawBody === undefined) {
    sendJson(response, HTTP_BAD_REQUEST, { error: "invalid_body" });
    return;
  }
  const reply = await router.dispatch({
    method: request.method ?? "",
    url: request.url ?? "",
    authorization: request.headers.authorization,
    rawBody,
  });
  if (reply) sendJson(response, reply.status, reply.body);
  else sendJson(response, HTTP_NOT_FOUND, { error: "not_found" });
}

function handleCors(cors: CorsGuard, request: IncomingMessage, response: ServerResponse): boolean {
  const origin = typeof request.headers.origin === "string" ? request.headers.origin : undefined;
  const decision = cors.evaluate({ method: request.method ?? "", origin });
  for (const [k, v] of Object.entries(decision.headers)) {
    response.setHeader(k, v);
  }
  if (decision.isPreflight) {
    response.statusCode = decision.status ?? 204;
    response.end();
    return true;
  }
  return false;
}

type RouteContext = {
  readonly deps: ServerDeps;
  readonly guards: { readonly cors: CorsGuard };
};

async function route(
  context: RouteContext,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  if (handleCors(context.guards.cors, request, response)) return;

  if (isRoute(request, "GET", "/health")) {
    sendJson(response, HTTP_OK, { status: "ok" });
  } else if (isRoute(request, "POST", REQUESTS_PATH)) {
    await serveRequests(context.deps, request, response);
  } else if (context.deps.router) {
    await serveRouter(context.deps.router, request, response);
  } else {
    sendJson(response, HTTP_NOT_FOUND, { error: "not_found" });
  }
}

export function createServer(deps: ServerDeps): Server {
  const guards = {
    cors: deps.cors ?? createCorsGuard(),
    logger: deps.logger ?? createStructuredLogger(),
  };

  return createHttpServer((request, response) => {
    response.on("finish", () => {
      guards.logger.info("request completed", {
        method: request.method,
        path: pathOf(request),
        status: response.statusCode,
      });
    });

    route({ deps, guards }, request, response).catch(() => {
      if (!response.headersSent) {
        sendJson(response, HTTP_INTERNAL_ERROR, { error: "internal_error" });
      }
    });
  });
}
