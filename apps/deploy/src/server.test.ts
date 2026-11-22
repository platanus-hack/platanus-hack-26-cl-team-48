import { err, ok } from "@nodomics/protocol";
import { describe, expect, it } from "vitest";
import { createDeployUseCases, type DeployUseCases } from "./deploy-use-cases.ts";
import { createMemoryFlowReader } from "./flow-reader.ts";
import type { IdentityPort } from "./identity.ts";
import { createMemoryDeploymentStore } from "./memory-deployment-store.ts";
import { createMemoryHostingProvider } from "./memory-hosting-provider.ts";
import { createDeployHandler } from "./server.ts";
import { deployFlow } from "./testing/deploy-flows.ts";
import type { Deployment, DeployErrorCode, Plan, UserIdentity } from "./types.ts";

const BASE = "http://deploy.test";
const ALLOWED_ORIGIN = "https://nodomics.app";
const ALICE: UserIdentity = { userId: "alice-0001", accessToken: "alice-token" };
const BOB: UserIdentity = { userId: "bob-0002", accessToken: "bob-token" };
const TOKENS: Record<string, UserIdentity> = { "alice-token": ALICE, "bob-token": BOB };
const MAX_BODY_BYTES = 64 * 1024;

const PLAN: Plan = {
  action: "create",
  hash: "hash-1",
  changes: [{ field: "repo", after: { url: "https://github.com/a/b", branch: "main" } }],
  spec: {
    repo: { url: "https://github.com/a/b", branch: "main" },
    build: { kind: "native", runtime: "node", startCommand: "npm start" },
    env: [],
  },
};
const DEPLOYMENT: Deployment = {
  id: "dep-1",
  flowId: "flow-1",
  nodeId: "web",
  url: "https://nd-alice000-web.onrender.com",
  status: "deploying",
  updatedAt: "2026-11-22T10:00:00.000Z",
};

const fakeIdentity = (failure?: "UNAVAILABLE"): IdentityPort => ({
  resolve: (authorization) => {
    if (failure !== undefined) return Promise.resolve(err({ code: failure, message: "Auth down" }));
    const user = TOKENS[authorization?.replace(/^Bearer /, "") ?? ""];
    return Promise.resolve(
      user === undefined ? err({ code: "UNAUTHORIZED", message: "Sign in" }) : ok(user),
    );
  },
});

type Call = { readonly name: string; readonly identity: UserIdentity; readonly input: unknown };

function fakeUseCases(failWith?: DeployErrorCode) {
  const calls: Call[] = [];
  const failure = () =>
    Promise.resolve(err({ code: failWith ?? "PROVIDER_ERROR", message: "It failed" }));
  const record = (name: string, identity: UserIdentity, input: unknown) =>
    calls.push({ name, identity, input });
  const useCases: DeployUseCases = {
    plan: (identity, input) => {
      record("plan", identity, input);
      return failWith === undefined ? Promise.resolve(ok(PLAN)) : failure();
    },
    apply: (identity, input) => {
      record("apply", identity, input);
      return failWith === undefined ? Promise.resolve(ok(DEPLOYMENT)) : failure();
    },
    list: (identity, flowId) => {
      record("list", identity, flowId);
      return failWith === undefined ? Promise.resolve(ok([DEPLOYMENT])) : failure();
    },
    remove: (identity, deploymentId) => {
      record("remove", identity, deploymentId);
      return failWith === undefined ? Promise.resolve(ok(undefined)) : failure();
    },
  };
  return { useCases, calls };
}

function handlerWith(options: { failWith?: DeployErrorCode; identity?: "UNAVAILABLE" } = {}) {
  const fake = fakeUseCases(options.failWith);
  const handler = createDeployHandler({
    identity: fakeIdentity(options.identity),
    useCases: fake.useCases,
    allowedOrigins: [ALLOWED_ORIGIN],
  });
  return { handler, calls: fake.calls };
}

const request = (
  method: string,
  path: string,
  options: { token?: string; body?: unknown; rawBody?: string; origin?: string } = {},
): Request => {
  const headers = new Headers();
  if (options.token !== undefined) headers.set("authorization", `Bearer ${options.token}`);
  if (options.origin !== undefined) headers.set("origin", options.origin);
  const body =
    options.rawBody ?? (options.body === undefined ? undefined : JSON.stringify(options.body));
  if (body !== undefined) headers.set("content-type", "application/json");
  return new Request(`${BASE}${path}`, {
    method,
    headers,
    ...(body === undefined ? {} : { body }),
  });
};

const authed = (method: string, path: string, body?: unknown): Request =>
  request(method, path, { token: "alice-token", ...(body === undefined ? {} : { body }) });

const PROTECTED_ROUTES: [string, string, unknown][] = [
  ["POST", "/plan", { flowId: "flow-1", nodeId: "web" }],
  ["POST", "/apply", { flowId: "flow-1", nodeId: "web", planHash: "hash-1", secrets: {} }],
  ["GET", "/deployments?flowId=flow-1", undefined],
  ["DELETE", "/deployments/dep-1", undefined],
];

describe("createDeployHandler — health and routing", () => {
  it("serves health without authentication", async () => {
    const { handler } = handlerWith();

    const response = await handler(request("GET", "/health"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it("answers JSON", async () => {
    const { handler } = handlerWith();

    const response = await handler(request("GET", "/health"));

    expect(response.headers.get("content-type")).toContain("application/json");
  });

  it("answers 404 NOT_FOUND for an unknown route", async () => {
    const { handler } = handlerWith();

    const response = await handler(authed("GET", "/nope"));

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });
});

describe("createDeployHandler — authentication", () => {
  it.each(PROTECTED_ROUTES)(
    "rejects %s %s without a token with 401 UNAUTHORIZED",
    async (method, path, body) => {
      const { handler, calls } = handlerWith();

      const response = await handler(request(method, path, body === undefined ? {} : { body }));

      expect(response.status).toBe(401);
      expect(await response.json()).toMatchObject({ ok: false, error: { code: "UNAUTHORIZED" } });
      expect(calls).toEqual([]);
    },
  );

  it.each(PROTECTED_ROUTES)(
    "rejects %s %s with an invalid token with 401 UNAUTHORIZED",
    async (method, path, body) => {
      const { handler, calls } = handlerWith();

      const response = await handler(
        request(method, path, { token: "forged", ...(body === undefined ? {} : { body }) }),
      );

      expect(response.status).toBe(401);
      expect(calls).toEqual([]);
    },
  );

  it("answers 503 UNAVAILABLE when the identity service is down", async () => {
    const { handler, calls } = handlerWith({ identity: "UNAVAILABLE" });

    const response = await handler(authed("POST", "/plan", { flowId: "flow-1", nodeId: "web" }));

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ ok: false, error: { code: "UNAVAILABLE" } });
    expect(calls).toEqual([]);
  });

  it("passes the identity of the token to the use case", async () => {
    const { handler, calls } = handlerWith();

    await handler(
      request("POST", "/plan", { token: "bob-token", body: { flowId: "flow-1", nodeId: "web" } }),
    );

    expect(calls[0]?.identity).toEqual(BOB);
  });
});

describe("createDeployHandler — routes", () => {
  it("plans a deployment", async () => {
    const { handler, calls } = handlerWith();

    const response = await handler(authed("POST", "/plan", { flowId: "flow-1", nodeId: "web" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, plan: PLAN });
    expect(calls).toEqual([
      { name: "plan", identity: ALICE, input: { flowId: "flow-1", nodeId: "web" } },
    ]);
  });

  it("applies a plan with its secrets", async () => {
    const { handler, calls } = handlerWith();
    const body = {
      flowId: "flow-1",
      nodeId: "web",
      planHash: "hash-1",
      secrets: { "github-token": "ghp_value" },
    };

    const response = await handler(authed("POST", "/apply", body));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, deployment: DEPLOYMENT });
    expect(calls).toEqual([{ name: "apply", identity: ALICE, input: body }]);
  });

  it("applies a plan with no secrets as an empty object", async () => {
    const { handler, calls } = handlerWith();

    await handler(
      authed("POST", "/apply", { flowId: "flow-1", nodeId: "web", planHash: "hash-1" }),
    );

    expect(calls[0]?.input).toEqual({
      flowId: "flow-1",
      nodeId: "web",
      planHash: "hash-1",
      secrets: {},
    });
  });

  it("lists the deployments of a flow", async () => {
    const { handler, calls } = handlerWith();

    const response = await handler(authed("GET", "/deployments?flowId=flow-1"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, deployments: [DEPLOYMENT] });
    expect(calls).toEqual([{ name: "list", identity: ALICE, input: "flow-1" }]);
  });

  it("deletes a deployment", async () => {
    const { handler, calls } = handlerWith();

    const response = await handler(authed("DELETE", "/deployments/dep-1"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(calls).toEqual([{ name: "remove", identity: ALICE, input: "dep-1" }]);
  });
});

describe("createDeployHandler — bad requests", () => {
  it.each([
    ["no body", undefined],
    ["an array", ["flow-1", "web"]],
    ["a missing nodeId", { flowId: "flow-1" }],
    ["an empty flowId", { flowId: "", nodeId: "web" }],
    ["a numeric nodeId", { flowId: "flow-1", nodeId: 7 }],
  ])("rejects a plan with %s as 400 BAD_REQUEST", async (_case, body) => {
    const { handler, calls } = handlerWith();

    const response = await handler(authed("POST", "/plan", body));

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ ok: false, error: { code: "BAD_REQUEST" } });
    expect(calls).toEqual([]);
  });

  it("rejects a body that is not JSON as 400 BAD_REQUEST", async () => {
    const { handler, calls } = handlerWith();

    const response = await handler(
      request("POST", "/plan", { token: "alice-token", rawBody: "{not json" }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ ok: false, error: { code: "BAD_REQUEST" } });
    expect(calls).toEqual([]);
  });

  it.each([
    ["a missing planHash", { flowId: "flow-1", nodeId: "web" }],
    ["an empty planHash", { flowId: "flow-1", nodeId: "web", planHash: "" }],
    ["secrets as an array", { flowId: "flow-1", nodeId: "web", planHash: "h", secrets: ["x"] }],
    ["a non-string secret", { flowId: "flow-1", nodeId: "web", planHash: "h", secrets: { a: 1 } }],
    ["null secrets", { flowId: "flow-1", nodeId: "web", planHash: "h", secrets: null }],
  ])("rejects an apply with %s as 400 BAD_REQUEST", async (_case, body) => {
    const { handler, calls } = handlerWith();

    const response = await handler(authed("POST", "/apply", body));

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ ok: false, error: { code: "BAD_REQUEST" } });
    expect(calls).toEqual([]);
  });

  it.each([["/deployments"], ["/deployments?flowId="]])(
    "rejects listing %s without a flow id as 400 BAD_REQUEST",
    async (path) => {
      const { handler, calls } = handlerWith();

      const response = await handler(authed("GET", path));

      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ ok: false, error: { code: "BAD_REQUEST" } });
      expect(calls).toEqual([]);
    },
  );

  it("rejects a body larger than 64 KB with 413 BAD_REQUEST", async () => {
    const { handler, calls } = handlerWith();
    const body = { flowId: "flow-1", nodeId: "web", padding: "x".repeat(MAX_BODY_BYTES) };

    const response = await handler(authed("POST", "/plan", body));

    expect(response.status).toBe(413);
    expect(await response.json()).toMatchObject({ ok: false, error: { code: "BAD_REQUEST" } });
    expect(calls).toEqual([]);
  });
});

describe("createDeployHandler — domain errors", () => {
  it.each<[DeployErrorCode, number]>([
    ["FLOW_NOT_FOUND", 404],
    ["NODE_NOT_FOUND", 404],
    ["NOT_A_SERVICE", 400],
    ["MISSING_REPO", 400],
    ["INVALID_REPO", 400],
    ["INVALID_SPEC", 400],
    ["QUOTA_USER", 409],
    ["QUOTA_TOTAL", 409],
    ["PLAN_CHANGED", 409],
    ["MISSING_SECRET", 400],
    ["DEPLOYMENT_NOT_FOUND", 404],
    ["PROVIDER_ERROR", 502],
    ["UNAVAILABLE", 503],
  ])("answers %s with HTTP %i", async (code, status) => {
    const { handler } = handlerWith({ failWith: code });

    const response = await handler(authed("POST", "/plan", { flowId: "flow-1", nodeId: "web" }));

    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ ok: false, error: { code, message: "It failed" } });
  });

  it("answers a failed delete with the error of the use case", async () => {
    const { handler } = handlerWith({ failWith: "DEPLOYMENT_NOT_FOUND" });

    const response = await handler(authed("DELETE", "/deployments/dep-404"));

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({
      ok: false,
      error: { code: "DEPLOYMENT_NOT_FOUND" },
    });
  });
});

describe("createDeployHandler — CORS", () => {
  it("allows a listed origin on a normal response", async () => {
    const { handler } = handlerWith();

    const response = await handler(
      request("GET", "/deployments?flowId=flow-1", {
        token: "alice-token",
        origin: ALLOWED_ORIGIN,
      }),
    );

    expect(response.headers.get("access-control-allow-origin")).toBe(ALLOWED_ORIGIN);
    expect(response.headers.get("vary")).toContain("Origin");
  });

  it("allows a listed origin on an unauthorized response so the browser can read it", async () => {
    const { handler } = handlerWith();

    const response = await handler(
      request("POST", "/plan", { origin: ALLOWED_ORIGIN, body: { flowId: "f", nodeId: "n" } }),
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("access-control-allow-origin")).toBe(ALLOWED_ORIGIN);
  });

  it("answers a preflight from a listed origin with 204 and the allowed methods and headers", async () => {
    const { handler, calls } = handlerWith();

    const response = await handler(
      new Request(`${BASE}/apply`, {
        method: "OPTIONS",
        headers: {
          origin: ALLOWED_ORIGIN,
          "access-control-request-method": "POST",
          "access-control-request-headers": "authorization, content-type",
        },
      }),
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe(ALLOWED_ORIGIN);
    expect(response.headers.get("access-control-allow-methods")).toBe("GET, POST, DELETE, OPTIONS");
    expect(response.headers.get("access-control-allow-headers")).toBe(
      "authorization, content-type",
    );
    expect(calls).toEqual([]);
  });

  it("does not allow an origin that is not listed", async () => {
    const { handler } = handlerWith();

    const response = await handler(
      request("GET", "/deployments?flowId=flow-1", {
        token: "alice-token",
        origin: "https://evil.example",
      }),
    );

    expect(response.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("does not answer a preflight from an origin that is not listed with CORS headers", async () => {
    const { handler } = handlerWith();

    const response = await handler(
      new Request(`${BASE}/apply`, {
        method: "OPTIONS",
        headers: { origin: "https://evil.example", "access-control-request-method": "POST" },
      }),
    );

    expect(response.headers.get("access-control-allow-origin")).toBeNull();
    expect(response.headers.get("access-control-allow-methods")).toBeNull();
  });

  it("never allows every origin with a wildcard", async () => {
    const { handler } = handlerWith();

    const response = await handler(request("GET", "/health", { origin: "https://evil.example" }));

    expect(response.headers.get("access-control-allow-origin")).not.toBe("*");
  });
});

describe("createDeployHandler — with the in-memory use cases", () => {
  const SECRET_VALUE = "ghp_never_echo_this";

  function realHandler() {
    const provider = createMemoryHostingProvider();
    let nextId = 0;
    const useCases = createDeployUseCases({
      flows: createMemoryFlowReader({
        [ALICE.userId]: {
          "flow-1": deployFlow({ service: { env: [{ name: "TOKEN", secret: "github-token" }] } }),
        },
      }),
      deployments: createMemoryDeploymentStore(),
      provider,
      now: () => new Date("2026-11-22T10:00:00.000Z"),
      createId: () => `dep-${String((nextId += 1))}`,
    });
    return createDeployHandler({
      identity: fakeIdentity(),
      useCases,
      allowedOrigins: [ALLOWED_ORIGIN],
    });
  }

  function planHashOf(body: unknown): string {
    if (
      typeof body === "object" &&
      body !== null &&
      "plan" in body &&
      typeof body.plan === "object" &&
      body.plan !== null &&
      "hash" in body.plan &&
      typeof body.plan.hash === "string"
    )
      return body.plan.hash;
    throw new Error("Expected a plan in the response");
  }

  async function deployAsAlice(handler: (request: Request) => Promise<Response>) {
    const planned = await handler(authed("POST", "/plan", { flowId: "flow-1", nodeId: "web" }));
    return handler(
      authed("POST", "/apply", {
        flowId: "flow-1",
        nodeId: "web",
        planHash: planHashOf(await planned.json()),
        secrets: { "github-token": SECRET_VALUE },
      }),
    );
  }

  it("never echoes a secret in the apply or list responses", async () => {
    const handler = realHandler();

    const applied = await (await deployAsAlice(handler)).text();
    const listed = await (await handler(authed("GET", "/deployments?flowId=flow-1"))).text();

    expect(applied).toContain('"ok":true');
    expect(applied).not.toContain(SECRET_VALUE);
    expect(listed).not.toContain(SECRET_VALUE);
  });

  it("never lets another user delete a deployment", async () => {
    const handler = realHandler();
    await deployAsAlice(handler);

    const response = await handler(request("DELETE", "/deployments/dep-1", { token: "bob-token" }));

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({
      ok: false,
      error: { code: "DEPLOYMENT_NOT_FOUND" },
    });
  });

  it("never lists another user's deployments", async () => {
    const handler = realHandler();
    await deployAsAlice(handler);

    const response = await handler(
      request("GET", "/deployments?flowId=flow-1", { token: "bob-token" }),
    );

    expect(await response.json()).toEqual({ ok: true, deployments: [] });
  });
});
