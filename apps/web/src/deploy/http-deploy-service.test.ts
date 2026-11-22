import { describe, expect, it } from "vitest";
import { createHttpDeployService } from "./http-deploy-service.ts";

const BASE_URL = "https://deploy.example.com";
const TOKEN = "token-123";
const FLOW_ID = "flow 1/ñ";
const NODE_ID = "web";
const PLAN_HASH = "hash-abc";
const SECRETS = { stripe: "sk_live_123" };

const CHANGES = [
  { field: "build.startCommand", before: "npm start", after: "node server.js" },
  { field: "env.MODE", after: "prod" },
];
const SPEC = {
  repo: { url: "https://github.com/ana/web", branch: "main" },
  build: { kind: "native", runtime: "node", startCommand: "node server.js" },
  env: [],
};
const PLAN = { action: "update", hash: PLAN_HASH, changes: CHANGES, spec: SPEC };
const DEPLOYMENT = {
  id: "dep-1",
  flowId: FLOW_ID,
  nodeId: NODE_ID,
  url: "https://nd-ana-web.onrender.com",
  status: "live",
  updatedAt: "2026-11-22T10:00:00.000Z",
};
const DEPLOYMENT_WITHOUT_URL = {
  id: "dep-2",
  flowId: FLOW_ID,
  nodeId: "api",
  status: "creating",
  updatedAt: "2026-11-22T10:05:00.000Z",
};

const KNOWN_CODES = [
  ["UNAUTHORIZED", 401],
  ["BAD_REQUEST", 400],
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
] as const;

type Call = { readonly url: string; readonly init: RequestInit | undefined };
type Reply = { readonly status: number; readonly body?: unknown; readonly raw?: string } | Error;

function urlOf(input: Parameters<typeof fetch>[0]): string {
  if (typeof input === "string") return input;
  return input instanceof URL ? input.href : input.url;
}

function responseOf(reply: Exclude<Reply, Error>): Response {
  const text = reply.raw ?? (reply.body === undefined ? null : JSON.stringify(reply.body));
  return new Response(text, {
    status: reply.status,
    headers: { "content-type": "application/json" },
  });
}

/** Answers every fetch with `reply` and records the requests. */
function setup(
  reply: Reply = { status: 200, body: { ok: true } },
  options: { readonly hasToken?: boolean; readonly baseUrl?: string } = {},
) {
  const calls: Call[] = [];
  const fakeFetch = (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
    calls.push({ url: urlOf(input), init });
    if (reply instanceof Error) return Promise.reject(reply);
    return Promise.resolve(responseOf(reply));
  };
  const service = createHttpDeployService({
    baseUrl: options.baseUrl ?? BASE_URL,
    getAccessToken: () => Promise.resolve((options.hasToken ?? true) ? TOKEN : undefined),
    fetch: fakeFetch,
  });
  return { service, calls };
}

type Service = ReturnType<typeof setup>["service"];

const headerOf = (call: Call | undefined, name: string) =>
  new Headers(call?.init?.headers).get(name);
const bodyOf = (call: Call | undefined): unknown =>
  JSON.parse(typeof call?.init?.body === "string" ? call.init.body : "null");
const methodOf = (call: Call | undefined) => call?.init?.method ?? "GET";

const plan = (service: Service) => service.plan({ flowId: FLOW_ID, nodeId: NODE_ID });
const apply = (service: Service) =>
  service.apply({ flowId: FLOW_ID, nodeId: NODE_ID, planHash: PLAN_HASH, secrets: SECRETS });
const list = (service: Service) => service.list(FLOW_ID);
const remove = (service: Service) => service.remove("dep 1/x");

const OPERATIONS = [
  ["plan", plan],
  ["apply", apply],
  ["list", list],
  ["remove", remove],
] as const;

describe("createHttpDeployService requests", () => {
  it("posts the flow and node ids to the plan path", async () => {
    const { service, calls } = setup({ status: 200, body: { ok: true, plan: PLAN } });

    await plan(service);

    expect({ url: calls[0]?.url, method: methodOf(calls[0]), body: bodyOf(calls[0]) }).toEqual({
      url: `${BASE_URL}/plan`,
      method: "POST",
      body: { flowId: FLOW_ID, nodeId: NODE_ID },
    });
  });

  it("posts the flow, node, plan hash and secrets to the apply path", async () => {
    const { service, calls } = setup({ status: 200, body: { ok: true, deployment: DEPLOYMENT } });

    await apply(service);

    expect({ url: calls[0]?.url, method: methodOf(calls[0]), body: bodyOf(calls[0]) }).toEqual({
      url: `${BASE_URL}/apply`,
      method: "POST",
      body: { flowId: FLOW_ID, nodeId: NODE_ID, planHash: PLAN_HASH, secrets: SECRETS },
    });
  });

  it("gets the deployments of the flow with its id encoded in the query", async () => {
    const { service, calls } = setup({ status: 200, body: { ok: true, deployments: [] } });

    await list(service);

    expect({ url: calls[0]?.url, method: methodOf(calls[0]) }).toEqual({
      url: `${BASE_URL}/deployments?flowId=${encodeURIComponent(FLOW_ID)}`,
      method: "GET",
    });
  });

  it("deletes a deployment by its id encoded in the path", async () => {
    const { service, calls } = setup({ status: 200, body: { ok: true } });

    await remove(service);

    expect({ url: calls[0]?.url, method: methodOf(calls[0]) }).toEqual({
      url: `${BASE_URL}/deployments/${encodeURIComponent("dep 1/x")}`,
      method: "DELETE",
    });
  });

  it.each(OPERATIONS)("sends the bearer token on %s", async (_name, call) => {
    const { service, calls } = setup();

    await call(service);

    expect(headerOf(calls[0], "authorization")).toBe(`Bearer ${TOKEN}`);
  });

  it.each([
    ["plan", plan],
    ["apply", apply],
  ] as const)("sends the %s body as JSON", async (_name, call) => {
    const { service, calls } = setup();

    await call(service);

    expect(headerOf(calls[0], "content-type")).toMatch(/^application\/json/);
  });

  it("drops a trailing slash from the base URL", async () => {
    const { service, calls } = setup(
      { status: 200, body: { ok: true, plan: PLAN } },
      { baseUrl: `${BASE_URL}/` },
    );

    await plan(service);

    expect(calls[0]?.url).toBe(`${BASE_URL}/plan`);
  });
});

describe("createHttpDeployService replies", () => {
  it("returns the plan's action, hash and changes, without the server's spec", async () => {
    const { service } = setup({ status: 200, body: { ok: true, plan: PLAN } });

    const result = await plan(service);

    expect(result).toEqual({
      ok: true,
      value: { action: "update", hash: PLAN_HASH, changes: CHANGES },
    });
  });

  it("returns the deployment that apply created", async () => {
    const { service } = setup({ status: 200, body: { ok: true, deployment: DEPLOYMENT } });

    const result = await apply(service);

    expect(result).toEqual({ ok: true, value: DEPLOYMENT });
  });

  it("returns the deployments of the flow, with or without a URL", async () => {
    const { service } = setup({
      status: 200,
      body: { ok: true, deployments: [DEPLOYMENT, DEPLOYMENT_WITHOUT_URL] },
    });

    const result = await list(service);

    expect(result).toEqual({ ok: true, value: [DEPLOYMENT, DEPLOYMENT_WITHOUT_URL] });
  });

  it("returns ok with no value when the deployment is removed", async () => {
    const { service } = setup({ status: 200, body: { ok: true } });

    const result = await remove(service);

    expect(result).toEqual({ ok: true, value: undefined });
  });

  it.each(KNOWN_CODES)("returns the %s error code the server answers", async (code, status) => {
    const { service } = setup({
      status,
      body: { ok: false, error: { code, message: "detalle del servidor" } },
    });

    const result = await plan(service);

    expect(result).toEqual({ ok: false, error: { code } });
  });

  it("returns UNAVAILABLE for an error code it does not know", async () => {
    const { service } = setup({
      status: 418,
      body: { ok: false, error: { code: "TEAPOT", message: "?" } },
    });

    const result = await plan(service);

    expect(result).toEqual({ ok: false, error: { code: "UNAVAILABLE" } });
  });

  it("returns UNAVAILABLE for a plan with an unknown action", async () => {
    const { service } = setup({
      status: 200,
      body: { ok: true, plan: { ...PLAN, action: "destroy" } },
    });

    const result = await plan(service);

    expect(result).toEqual({ ok: false, error: { code: "UNAVAILABLE" } });
  });

  it("returns UNAVAILABLE for a plan without a hash", async () => {
    const { service } = setup({
      status: 200,
      body: { ok: true, plan: { action: "create", changes: [] } },
    });

    const result = await plan(service);

    expect(result).toEqual({ ok: false, error: { code: "UNAVAILABLE" } });
  });

  it("returns UNAVAILABLE for a deployment with an unknown status", async () => {
    const { service } = setup({
      status: 200,
      body: { ok: true, deployment: { ...DEPLOYMENT, status: "sleeping" } },
    });

    const result = await apply(service);

    expect(result).toEqual({ ok: false, error: { code: "UNAVAILABLE" } });
  });

  it("returns UNAVAILABLE when the deployments are not a list", async () => {
    const { service } = setup({ status: 200, body: { ok: true, deployments: DEPLOYMENT } });

    const result = await list(service);

    expect(result).toEqual({ ok: false, error: { code: "UNAVAILABLE" } });
  });

  it("returns UNAVAILABLE when an error reply has no code", async () => {
    const { service } = setup({ status: 500, body: { ok: false } });

    const result = await list(service);

    expect(result).toEqual({ ok: false, error: { code: "UNAVAILABLE" } });
  });

  it.each(OPERATIONS)("returns UNAVAILABLE from %s when the body is not JSON", async (_n, call) => {
    const { service } = setup({ status: 200, raw: "<html>oops</html>" });

    const result = await call(service);

    expect(result).toEqual({ ok: false, error: { code: "UNAVAILABLE" } });
  });

  it.each(OPERATIONS)("returns UNAVAILABLE from %s on a network error", async (_name, call) => {
    const { service } = setup(new TypeError("Failed to fetch"));

    const result = await call(service);

    expect(result).toEqual({ ok: false, error: { code: "UNAVAILABLE" } });
  });
});

describe("createHttpDeployService without a token", () => {
  it.each(OPERATIONS)("returns UNAUTHORIZED from %s and never calls fetch", async (_n, call) => {
    const { service, calls } = setup({ status: 200, body: { ok: true } }, { hasToken: false });

    const result = await call(service);

    expect({ result, calls: calls.length }).toEqual({
      result: { ok: false, error: { code: "UNAUTHORIZED" } },
      calls: 0,
    });
  });
});
