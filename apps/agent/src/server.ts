import {
  createServer as createHttpServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import type { Router } from "./http/router.ts";
import type { HttpReply, RequestInput } from "./requests/handle-request.ts";

export type ServerDeps = {
  readonly handleRequest: (input: RequestInput) => Promise<HttpReply>;
  readonly router?: Router;
};

const HTTP_OK = 200;
const HTTP_BAD_REQUEST = 400;
const HTTP_NOT_FOUND = 404;
const HTTP_INTERNAL_ERROR = 500;
const MAX_BODY_BYTES = 16_384;
const REQUESTS_PATH = "/agent/requests";

const pathOf = (request: IncomingMessage): string | undefined => request.url?.split("?", 1)[0];

const isRoute = (request: IncomingMessage, method: string, path: string): boolean =>
  request.method === method && pathOf(request) === path;

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(body));
}

async function readBody(request: IncomingMessage): Promise<string | undefined> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.from(chunk as Uint8Array);
    size += buffer.length;
    if (size > MAX_BODY_BYTES) return undefined;
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

async function serveRouter(
  router: Router,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  const rawBody = await readBody(request);
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

async function route(
  deps: ServerDeps,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  if (isRoute(request, "GET", "/health")) {
    sendJson(response, HTTP_OK, { status: "ok" });
  } else if (isRoute(request, "POST", REQUESTS_PATH)) {
    await serveRequests(deps, request, response);
  } else if (deps.router) {
    await serveRouter(deps.router, request, response);
  } else {
    sendJson(response, HTTP_NOT_FOUND, { error: "not_found" });
  }
}

export function createServer(deps: ServerDeps): Server {
  return createHttpServer((request, response) => {
    route(deps, request, response).catch(() => {
      if (!response.headersSent) {
        sendJson(response, HTTP_INTERNAL_ERROR, { error: "internal_error" });
      }
    });
  });
}
