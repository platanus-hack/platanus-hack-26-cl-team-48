import { err, ok } from "@nodomics/protocol";
import type { DeployResult, DeployService } from "./deploy-service.ts";
import {
  parseDeployment,
  parseDeployments,
  parsePlan,
  parseReplyBody,
} from "./parse-deploy-reply.ts";

export type HttpDeployDeps = {
  readonly baseUrl: string;
  readonly getAccessToken: () => Promise<string | undefined>;
  readonly fetch: typeof fetch;
};

type Request = {
  readonly method: "GET" | "POST" | "DELETE";
  readonly path: string;
  readonly body?: unknown;
};

const deploymentsPath = (flowId: string) => `/deployments?flowId=${encodeURIComponent(flowId)}`;
const deploymentPath = (id: string) => `/deployments/${encodeURIComponent(id)}`;

const unavailable = () => err({ code: "UNAVAILABLE" as const });

/** Turns a successful body into a value, or UNAVAILABLE when it breaks the contract. */
const parsedOr = <T>(value: T | undefined): DeployResult<T> =>
  value === undefined ? unavailable() : ok(value);

/** The hosting service through the HTTP routes of apps/deploy (ADR 0027 §5). */
export function createHttpDeployService(deps: HttpDeployDeps): DeployService {
  const send = createSender(deps);
  return {
    plan: async (request) => {
      const reply = await send({ method: "POST", path: "/plan", body: request });
      return reply.ok ? parsedOr(parsePlan(reply.value["plan"])) : reply;
    },
    apply: async (request) => {
      const reply = await send({ method: "POST", path: "/apply", body: request });
      return reply.ok ? parsedOr(parseDeployment(reply.value["deployment"])) : reply;
    },
    redeploy: async (request) => {
      const reply = await send({ method: "POST", path: "/redeploy", body: request });
      return reply.ok ? parsedOr(parseDeployment(reply.value["deployment"])) : reply;
    },
    list: async (flowId) => {
      const reply = await send({ method: "GET", path: deploymentsPath(flowId) });
      return reply.ok ? parsedOr(parseDeployments(reply.value["deployments"])) : reply;
    },
    remove: async (deploymentId) => {
      const reply = await send({ method: "DELETE", path: deploymentPath(deploymentId) });
      return reply.ok ? ok(undefined) : reply;
    },
  };
}

/** Sends a request with the user's token and returns the body of a `{ ok: true }` reply. */
function createSender({ baseUrl, getAccessToken, fetch }: HttpDeployDeps) {
  const root = baseUrl.replace(/\/+$/, "");
  return async ({
    method,
    path,
    body,
  }: Request): Promise<DeployResult<Record<string, unknown>>> => {
    const token = await getAccessToken();
    if (token === undefined) return err({ code: "UNAUTHORIZED" });
    try {
      const response = await fetch(`${root}${path}`, {
        method,
        headers: {
          authorization: `Bearer ${token}`,
          ...(body === undefined ? {} : { "content-type": "application/json" }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      const reply = parseReplyBody(await response.json().catch(() => undefined));
      return reply.ok ? ok(reply.body) : err({ code: reply.code });
    } catch {
      return unavailable();
    }
  };
}
