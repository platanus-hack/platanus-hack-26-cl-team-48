import { parse } from "@nodomics/protocol";
import { Type, type Static, type TSchema } from "@sinclair/typebox";
import type { DeployUseCases } from "./deploy-use-cases.ts";
import type { IdentityPort } from "./identity.ts";
import { createRateLimiter, type RateLimit } from "./rate-limiter.ts";
import type { DeployErrorCode, UserIdentity } from "./types.ts";

export const MAX_BODY_BYTES = 64 * 1024;

type ErrorCode = DeployErrorCode | "NOT_FOUND";
type RouteContext = {
  readonly useCases: DeployUseCases;
  readonly identity: UserIdentity;
  readonly request: Request;
  readonly url: URL;
};
type RouteHandler = (context: RouteContext) => Promise<Response>;
export type DeployHandlerDeps = {
  readonly identity: IdentityPort;
  readonly useCases: DeployUseCases;
  readonly allowedOrigins: readonly string[];
  readonly rateLimit?: RateLimit;
  readonly now?: () => number;
};
type Responder = {
  readonly deps: DeployHandlerDeps;
  readonly isAllowed: (userId: string) => boolean;
};

const HTTP_OK = 200;
const HTTP_NO_CONTENT = 204;
const HTTP_PAYLOAD_TOO_LARGE = 413;
const HTTP_STATUS: Record<ErrorCode, number> = {
  UNAUTHORIZED: 401,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  FLOW_NOT_FOUND: 404,
  NODE_NOT_FOUND: 404,
  NOT_A_SERVICE: 400,
  MISSING_REPO: 400,
  INVALID_REPO: 400,
  INVALID_SPEC: 400,
  QUOTA_USER: 409,
  QUOTA_TOTAL: 409,
  PLAN_CHANGED: 409,
  MISSING_SECRET: 400,
  DEPLOYMENT_NOT_FOUND: 404,
  PROVIDER_ERROR: 502,
  UNAVAILABLE: 503,
  SERVICE_KIND_CHANGED: 409,
  RATE_LIMITED: 429,
};
const CORS_METHODS = "GET, POST, DELETE, OPTIONS";
const CORS_HEADERS = "authorization, content-type";
const DEPLOYMENT_PATH = /^\/deployments\/([^/]+)$/;

const Id = Type.String({ minLength: 1 });
const PlanBody = Type.Object({ flowId: Id, nodeId: Id });
const ApplyBody = Type.Object({
  flowId: Id,
  nodeId: Id,
  planHash: Id,
  secrets: Type.Optional(Type.Record(Type.String(), Type.String())),
});
const RedeployBody = Type.Object({
  flowId: Id,
  nodeId: Id,
  secrets: Type.Optional(Type.Record(Type.String(), Type.String())),
});

const ROUTES: Readonly<Record<string, RouteHandler>> = {
  "POST /plan": async ({ useCases, identity, request }) => {
    const body = await bodyOf(request, PlanBody);
    if (body instanceof Response) return body;
    const plan = await useCases.plan(identity, { flowId: body.flowId, nodeId: body.nodeId });
    return plan.ok ? json(HTTP_OK, { ok: true, plan: plan.value }) : failed(plan.error);
  },
  "POST /apply": async ({ useCases, identity, request }) => {
    const body = await bodyOf(request, ApplyBody);
    if (body instanceof Response) return body;
    const deployment = await useCases.apply(identity, {
      flowId: body.flowId,
      nodeId: body.nodeId,
      planHash: body.planHash,
      secrets: body.secrets ?? {},
    });
    return deployment.ok
      ? json(HTTP_OK, { ok: true, deployment: deployment.value })
      : failed(deployment.error);
  },
  "POST /redeploy": async ({ useCases, identity, request }) => {
    const body = await bodyOf(request, RedeployBody);
    if (body instanceof Response) return body;
    const deployment = await useCases.redeploy(identity, {
      flowId: body.flowId,
      nodeId: body.nodeId,
      secrets: body.secrets ?? {},
    });
    return deployment.ok
      ? json(HTTP_OK, { ok: true, deployment: deployment.value })
      : failed(deployment.error);
  },
  "GET /deployments": async ({ useCases, identity, url }) => {
    const flowId = url.searchParams.get("flowId") ?? "";
    if (flowId === "") return failed({ code: "BAD_REQUEST", message: "flowId is required" });
    const deployments = await useCases.list(identity, flowId);
    return deployments.ok
      ? json(HTTP_OK, { ok: true, deployments: deployments.value })
      : failed(deployments.error);
  },
};

/** The HTTP API of apps/deploy as a fetch handler, so it runs the same under node:http and in tests. */
export function createDeployHandler(
  deps: DeployHandlerDeps,
): (request: Request) => Promise<Response> {
  const responder = { deps, isAllowed: rateLimiterOf(deps) };
  return async (request) => {
    const origin = allowedOriginOf(request, deps.allowedOrigins);
    const response =
      request.method === "OPTIONS"
        ? preflight(origin !== undefined)
        : await respond(responder, request);
    return origin === undefined ? response : withCors(response, origin);
  };
}

function allowedOriginOf(request: Request, allowedOrigins: readonly string[]): string | undefined {
  const origin = request.headers.get("origin");
  return origin !== null && allowedOrigins.includes(origin) ? origin : undefined;
}

function rateLimiterOf({ rateLimit, now = Date.now }: DeployHandlerDeps) {
  return rateLimit === undefined ? () => true : createRateLimiter(rateLimit, now);
}

async function respond({ deps, isAllowed }: Responder, request: Request): Promise<Response> {
  const url = new URL(request.url);
  if (request.method === "GET" && url.pathname === "/health") return json(HTTP_OK, { ok: true });
  const route = routeOf(request.method, url.pathname);
  if (route === undefined) return failed({ code: "NOT_FOUND", message: "There is no such route" });
  const identity = await deps.identity.resolve(request.headers.get("authorization") ?? undefined);
  if (!identity.ok) return failed(identity.error);
  if (!isAllowed(identity.value.userId))
    return failed({ code: "RATE_LIMITED", message: "Too many requests; try again in a moment" });
  return route({ useCases: deps.useCases, identity: identity.value, request, url });
}

function routeOf(method: string, pathname: string): RouteHandler | undefined {
  const deploymentId = DEPLOYMENT_PATH.exec(pathname)?.[1];
  if (method === "DELETE" && deploymentId !== undefined)
    return ({ useCases, identity }) => {
      const decoded = decodedPathSegment(deploymentId);
      return decoded === undefined
        ? Promise.resolve(failed({ code: "BAD_REQUEST", message: "The deployment id is not valid" }))
        : removeDeployment(useCases, identity, decoded);
    };
  return ROUTES[`${method} ${pathname}`];
}

async function removeDeployment(
  useCases: DeployUseCases,
  identity: UserIdentity,
  deploymentId: string,
): Promise<Response> {
  const removed = await useCases.remove(identity, deploymentId);
  return removed.ok ? json(HTTP_OK, { ok: true }) : failed(removed.error);
}

/** The parsed JSON body, or the error response to send instead. */
async function bodyOf<S extends TSchema>(
  request: Request,
  schema: S,
): Promise<Static<S> | Response> {
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES)
    return failed(
      { code: "BAD_REQUEST", message: "The body is larger than 64 KB" },
      HTTP_PAYLOAD_TOO_LARGE,
    );
  const body = parse(schema, parseJson(text));
  return body.ok ? body.value : failed({ code: "BAD_REQUEST", message: "The body is not valid" });
}

function decodedPathSegment(segment: string): string | undefined {
  try {
    return decodeURIComponent(segment);
  } catch {
    return undefined;
  }
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function preflight(isAllowedOrigin: boolean): Response {
  return new Response(
    null,
    isAllowedOrigin
      ? {
          status: HTTP_NO_CONTENT,
          headers: {
            "Access-Control-Allow-Methods": CORS_METHODS,
            "Access-Control-Allow-Headers": CORS_HEADERS,
          },
        }
      : { status: HTTP_NO_CONTENT },
  );
}

function withCors(response: Response, origin: string): Response {
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", origin);
  headers.append("Vary", "Origin");
  return new Response(response.body, { status: response.status, headers });
}

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const failed = (
  error: { readonly code: ErrorCode; readonly message: string },
  status = HTTP_STATUS[error.code],
): Response => json(status, { ok: false, error: { code: error.code, message: error.message } });
