import { describe, expect, it } from "vitest";
import { createRenderProvider } from "./render-provider.ts";
import type { ServiceSpec } from "./types.ts";

const API_KEY = "rnd_SuperSecretApiKey123";
const OWNER_ID = "tea-nodomics";
const BASE_URL = "https://api.render.com/v1";
const NAME = "nd-3f2a9c1e-web-a1b2c3";

const NATIVE_SPEC: ServiceSpec = {
  repo: { url: "https://github.com/nodomics/demo-app", branch: "main" },
  build: { kind: "native", runtime: "node", buildCommand: "npm ci", startCommand: "npm start" },
  env: [
    { name: "NODE_ENV", value: "production" },
    { name: "API_TOKEN", secret: "github-token" },
  ],
};
const SECRETS = { "github-token": "ghp_resolved_secret" };

type SeenRequest = {
  readonly url: string;
  readonly method: string;
  readonly headers: Headers;
  readonly body: unknown;
};
type Route = (request: SeenRequest) => Response | Promise<Response>;

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

async function readRequest(
  input: string | URL | Request,
  init?: RequestInit,
): Promise<SeenRequest> {
  const request = new Request(input, init);
  const text = await request.text();
  return {
    url: request.url,
    method: request.method,
    headers: request.headers,
    body: text === "" ? undefined : JSON.parse(text),
  };
}

function fakeFetch(route: Route): {
  readonly fetch: typeof fetch;
  readonly requests: SeenRequest[];
} {
  const requests: SeenRequest[] = [];
  const fetchImpl = async (input: string | URL | Request, init?: RequestInit) => {
    const request = await readRequest(input, init);
    requests.push(request);
    return route(request);
  };
  return { fetch: fetchImpl, requests };
}

function providerWith(route: Route, baseUrl?: string) {
  const fake = fakeFetch(route);
  const provider = createRenderProvider({
    apiKey: API_KEY,
    ownerId: OWNER_ID,
    fetch: fake.fetch,
    ...(baseUrl === undefined ? {} : { baseUrl }),
  });
  return { provider, requests: fake.requests };
}

const createdService = (id = "srv-abc", url = `https://${NAME}.onrender.com`) =>
  json({ service: { id, serviceDetails: { url } }, deployId: "dep-1" }, 201);

const pathOf = (request: SeenRequest | undefined): string => {
  if (request === undefined) return "";
  const url = new URL(request.url);
  return `${url.pathname}${url.search}`;
};

describe("createRenderProvider — create", () => {
  it("posts the service to the Render API with the API key as a bearer token", async () => {
    const { provider, requests } = providerWith(() => createdService());

    await provider.create({ name: NAME, spec: NATIVE_SPEC, secrets: SECRETS });

    expect(requests).toHaveLength(1);
    expect(requests[0]?.method).toBe("POST");
    expect(requests[0]?.url).toBe(`${BASE_URL}/services`);
    expect(requests[0]?.headers.get("authorization")).toBe(`Bearer ${API_KEY}`);
    expect(requests[0]?.headers.get("content-type")).toContain("application/json");
  });

  it("returns the service id and the URL Render assigned", async () => {
    const { provider } = providerWith(() => createdService("srv-xyz", "https://x.onrender.com"));

    const result = await provider.create({ name: NAME, spec: NATIVE_SPEC, secrets: SECRETS });

    expect(result).toEqual({
      ok: true,
      value: { serviceId: "srv-xyz", url: "https://x.onrender.com" },
    });
  });

  it("sends a native web service on the free plan in the fixed region with the auto-deploy trigger off", async () => {
    const { provider, requests } = providerWith(() => createdService());

    await provider.create({ name: NAME, spec: NATIVE_SPEC, secrets: SECRETS });

    expect(requests[0]?.body).toEqual({
      type: "web_service",
      name: NAME,
      ownerId: OWNER_ID,
      repo: "https://github.com/nodomics/demo-app",
      branch: "main",
      autoDeployTrigger: "off",
      envVars: [
        { key: "NODE_ENV", value: "production" },
        { key: "API_TOKEN", value: "ghp_resolved_secret" },
      ],
      serviceDetails: {
        runtime: "node",
        plan: "free",
        region: "oregon",
        envSpecificDetails: { buildCommand: "npm ci", startCommand: "npm start" },
      },
    });
  });

  it("sends a Docker web service with its Dockerfile and context", async () => {
    const { provider, requests } = providerWith(() => createdService());
    const spec: ServiceSpec = {
      repo: { url: "https://github.com/nodomics/demo-app", branch: "dev", rootDir: "api" },
      build: { kind: "docker", dockerfilePath: "Dockerfile.prod", dockerContext: "./api" },
      env: [],
      healthCheckPath: "/health",
    };

    await provider.create({ name: NAME, spec, secrets: {} });

    expect(requests[0]?.body).toEqual({
      type: "web_service",
      name: NAME,
      ownerId: OWNER_ID,
      repo: "https://github.com/nodomics/demo-app",
      branch: "dev",
      rootDir: "api",
      autoDeployTrigger: "off",
      envVars: [],
      serviceDetails: {
        runtime: "docker",
        plan: "free",
        region: "oregon",
        healthCheckPath: "/health",
        envSpecificDetails: { dockerfilePath: "Dockerfile.prod", dockerContext: "./api" },
      },
    });
  });

  it("sends a static site with its build command and publish path", async () => {
    const { provider, requests } = providerWith(() => createdService());
    const spec: ServiceSpec = {
      repo: { url: "https://github.com/nodomics/site", branch: "main" },
      build: { kind: "static", buildCommand: "npm run build", publishPath: "out" },
      env: [{ name: "VITE_API", value: "https://api.example.com" }],
    };

    await provider.create({ name: NAME, spec, secrets: {} });

    expect(requests[0]?.body).toEqual({
      type: "static_site",
      name: NAME,
      ownerId: OWNER_ID,
      repo: "https://github.com/nodomics/site",
      branch: "main",
      autoDeployTrigger: "off",
      envVars: [{ key: "VITE_API", value: "https://api.example.com" }],
      serviceDetails: { buildCommand: "npm run build", publishPath: "out" },
    });
  });

  it("omits the optional build command of a static site when there is none", async () => {
    const { provider, requests } = providerWith(() => createdService());
    const spec: ServiceSpec = {
      repo: { url: "https://github.com/nodomics/site", branch: "main" },
      build: { kind: "static", publishPath: "dist" },
      env: [],
    };

    await provider.create({ name: NAME, spec, secrets: {} });

    expect(requests[0]?.body).toMatchObject({ serviceDetails: { publishPath: "dist" } });
    expect(requests[0]?.body).not.toHaveProperty("serviceDetails.buildCommand");
  });

  it("never sends the deprecated autoDeploy field when creating", async () => {
    const { provider, requests } = providerWith(() => createdService());

    await provider.create({ name: NAME, spec: NATIVE_SPEC, secrets: SECRETS });

    expect(requests[0]?.body).not.toHaveProperty("autoDeploy");
  });

  it("uses the base URL it was given", async () => {
    const { provider, requests } = providerWith(() => createdService(), "http://render.test/v1");

    await provider.create({ name: NAME, spec: NATIVE_SPEC, secrets: SECRETS });

    expect(requests[0]?.url).toBe("http://render.test/v1/services");
  });

  it("fails with an error when the response has no service id", async () => {
    const { provider } = providerWith(() => json({}, 201));

    const result = await provider.create({ name: NAME, spec: NATIVE_SPEC, secrets: SECRETS });

    expect(result.ok).toBe(false);
  });
});

describe("createRenderProvider — update", () => {
  const routeUpdate: Route = (request) =>
    request.method === "POST" ? json({ id: "dep-2" }, 201) : json({});

  it("patches the service, replaces its variables and starts a deploy, in that order", async () => {
    const { provider, requests } = providerWith(routeUpdate);

    const result = await provider.update("srv-abc", { spec: NATIVE_SPEC, secrets: SECRETS });

    expect(result.ok).toBe(true);
    expect(requests.map((request) => `${request.method} ${pathOf(request)}`)).toEqual([
      "PATCH /v1/services/srv-abc",
      "PUT /v1/services/srv-abc/env-vars",
      "POST /v1/services/srv-abc/deploys",
    ]);
  });

  it("sends the API key on every request", async () => {
    const { provider, requests } = providerWith(routeUpdate);

    await provider.update("srv-abc", { spec: NATIVE_SPEC, secrets: SECRETS });

    expect(requests.map((request) => request.headers.get("authorization"))).toEqual([
      `Bearer ${API_KEY}`,
      `Bearer ${API_KEY}`,
      `Bearer ${API_KEY}`,
    ]);
  });

  it("patches the whitelisted fields with the fixed plan and the auto-deploy trigger off", async () => {
    const { provider, requests } = providerWith(routeUpdate);

    await provider.update("srv-abc", { spec: NATIVE_SPEC, secrets: SECRETS });

    expect(requests[0]?.body).toMatchObject({
      repo: "https://github.com/nodomics/demo-app",
      branch: "main",
      autoDeployTrigger: "off",
      serviceDetails: {
        runtime: "node",
        plan: "free",
        envSpecificDetails: { buildCommand: "npm ci", startCommand: "npm start" },
      },
    });
  });

  it("does not patch the region, which Render only accepts on create", async () => {
    const { provider, requests } = providerWith(routeUpdate);

    await provider.update("srv-abc", { spec: NATIVE_SPEC, secrets: SECRETS });

    expect(requests[0]?.body).not.toHaveProperty("region");
    expect(requests[0]?.body).not.toHaveProperty("serviceDetails.region");
  });

  it("does not patch the region of a Docker service either", async () => {
    const { provider, requests } = providerWith(routeUpdate);
    const spec: ServiceSpec = {
      repo: { url: "https://github.com/nodomics/demo-app", branch: "main" },
      build: { kind: "docker", dockerfilePath: "Dockerfile", dockerContext: "." },
      env: [],
    };

    await provider.update("srv-abc", { spec, secrets: {} });

    expect(requests[0]?.body).toMatchObject({ serviceDetails: { runtime: "docker" } });
    expect(requests[0]?.body).not.toHaveProperty("serviceDetails.region");
  });

  it("never sends the deprecated autoDeploy field when patching", async () => {
    const { provider, requests } = providerWith(routeUpdate);

    await provider.update("srv-abc", { spec: NATIVE_SPEC, secrets: SECRETS });

    expect(requests[0]?.body).not.toHaveProperty("autoDeploy");
  });

  it("does not patch the type, the owner or the variables", async () => {
    const { provider, requests } = providerWith(routeUpdate);

    await provider.update("srv-abc", { spec: NATIVE_SPEC, secrets: SECRETS });

    expect(requests[0]?.body).not.toHaveProperty("type");
    expect(requests[0]?.body).not.toHaveProperty("ownerId");
    expect(requests[0]?.body).not.toHaveProperty("envVars");
  });

  it("replaces the variables with literal values and resolved secrets", async () => {
    const { provider, requests } = providerWith(routeUpdate);

    await provider.update("srv-abc", { spec: NATIVE_SPEC, secrets: SECRETS });

    expect(requests[1]?.body).toEqual([
      { key: "NODE_ENV", value: "production" },
      { key: "API_TOKEN", value: "ghp_resolved_secret" },
    ]);
  });

  it("stops and fails when the patch is rejected", async () => {
    const { provider, requests } = providerWith(() => json({ message: "bad request" }, 400));

    const result = await provider.update("srv-abc", { spec: NATIVE_SPEC, secrets: SECRETS });

    expect(result.ok).toBe(false);
    expect(requests).toHaveLength(1);
  });
});

describe("createRenderProvider — status", () => {
  const routeStatus =
    (deploys: unknown, suspended = "not_suspended"): Route =>
    (request) =>
      pathOf(request).includes("/deploys")
        ? json(deploys)
        : json({ id: "srv-abc", suspended, serviceDetails: { url: "https://x.onrender.com" } });

  it("reads the service and its latest deploy", async () => {
    const { provider, requests } = providerWith(routeStatus([{ deploy: { status: "live" } }]));

    await provider.status("srv-abc");

    expect(requests.map((request) => `${request.method} ${pathOf(request)}`)).toEqual([
      "GET /v1/services/srv-abc",
      "GET /v1/services/srv-abc/deploys?limit=1",
    ]);
  });

  it("maps a suspended service to suspended", async () => {
    const { provider } = providerWith(routeStatus([{ deploy: { status: "live" } }], "suspended"));

    const result = await provider.status("srv-abc");

    expect(result).toEqual({ ok: true, value: "suspended" });
  });

  it.each([
    ["live", "live"],
    ["created", "deploying"],
    ["build_in_progress", "deploying"],
    ["update_in_progress", "deploying"],
    ["pre_deploy_in_progress", "deploying"],
    ["build_failed", "failed"],
    ["update_failed", "failed"],
    ["pre_deploy_failed", "failed"],
    ["canceled", "failed"],
    ["deactivated", "failed"],
  ])("maps the latest deploy status %s to %s", async (renderStatus, expected) => {
    const { provider } = providerWith(routeStatus([{ deploy: { status: renderStatus } }]));

    const result = await provider.status("srv-abc");

    expect(result).toEqual({ ok: true, value: expected });
  });

  it("maps a service without deploys to creating", async () => {
    const { provider } = providerWith(routeStatus([]));

    const result = await provider.status("srv-abc");

    expect(result).toEqual({ ok: true, value: "creating" });
  });

  it("fails when the service cannot be read", async () => {
    const { provider } = providerWith(() => json({ message: "not found" }, 404));

    const result = await provider.status("srv-abc");

    expect(result.ok).toBe(false);
  });
});

describe("createRenderProvider — remove", () => {
  it("deletes the service", async () => {
    const { provider, requests } = providerWith(() => new Response(null, { status: 204 }));

    const result = await provider.remove("srv-abc");

    expect(result.ok).toBe(true);
    expect(requests.map((request) => `${request.method} ${pathOf(request)}`)).toEqual([
      "DELETE /v1/services/srv-abc",
    ]);
    expect(requests[0]?.headers.get("authorization")).toBe(`Bearer ${API_KEY}`);
  });
});

describe("createRenderProvider — failures", () => {
  const operations = [
    [
      "create",
      (provider: ReturnType<typeof createRenderProvider>) =>
        provider.create({ name: NAME, spec: NATIVE_SPEC, secrets: SECRETS }),
    ],
    [
      "update",
      (provider: ReturnType<typeof createRenderProvider>) =>
        provider.update("srv-abc", { spec: NATIVE_SPEC, secrets: SECRETS }),
    ],
    ["status", (provider: ReturnType<typeof createRenderProvider>) => provider.status("srv-abc")],
    ["remove", (provider: ReturnType<typeof createRenderProvider>) => provider.remove("srv-abc")],
  ] as const;

  it.each(operations)("returns an error from %s on a non-2xx response", async (_name, run) => {
    const { provider } = providerWith(() => json({ message: "internal error" }, 500));

    const result = await run(provider);

    expect(result.ok).toBe(false);
    expect(result.ok ? "" : result.error.message).not.toBe("");
  });

  it.each(operations)(
    "returns an error from %s instead of throwing when fetch fails",
    async (_name, run) => {
      const { provider } = providerWith(() => Promise.reject(new TypeError("fetch failed")));

      const result = await run(provider);

      expect(result.ok).toBe(false);
    },
  );

  it.each(operations)(
    "never includes the API key in the error message of %s, even when Render echoes it",
    async (_name, run) => {
      const { provider } = providerWith(() =>
        json({ message: `invalid credentials: Bearer ${API_KEY}` }, 401),
      );

      const result = await run(provider);

      expect(result.ok).toBe(false);
      expect(JSON.stringify(result)).not.toContain(API_KEY);
    },
  );

  it("never includes the API key in the error message when fetch throws with it", async () => {
    const { provider } = providerWith(() =>
      Promise.reject(new Error(`request with Authorization: Bearer ${API_KEY} failed`)),
    );

    const result = await provider.remove("srv-abc");

    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain(API_KEY);
  });

  it("never includes a resolved secret in the error message of a failed create", async () => {
    const { provider } = providerWith(() =>
      json({ message: `invalid env var value ${SECRETS["github-token"]}` }, 400),
    );

    const result = await provider.create({ name: NAME, spec: NATIVE_SPEC, secrets: SECRETS });

    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain(SECRETS["github-token"]);
  });
});

describe("createRenderProvider — removing a service that is already gone", () => {
  it("treats a 404 from Render as removed", async () => {
    const { provider } = providerWith(() => json({ message: "not found" }, 404));

    const result = await provider.remove("srv-gone");

    expect(result).toEqual({ ok: true, value: undefined });
  });

  it("still fails on a 403 from Render", async () => {
    const { provider } = providerWith(() => json({ message: "forbidden" }, 403));

    const result = await provider.remove("srv-abc");

    expect(result.ok).toBe(false);
  });
});

describe("createRenderProvider — timeouts", () => {
  const TIMEOUT_MS = 20;
  const TEST_TIMEOUT_MS = 2_000;

  const signalOf = (input: string | URL | Request, init?: RequestInit) =>
    init?.signal ?? (input instanceof Request ? input.signal : undefined);

  /** A fetch that never answers; it only rejects when the request is aborted. */
  const hangingFetch = (input: string | URL | Request, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      const signal = signalOf(input, init);
      if (signal === undefined || signal === null) return;
      if (signal.aborted) reject(new DOMException("Aborted", "AbortError"));
      signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    });

  const hangingProvider = () =>
    createRenderProvider({
      apiKey: API_KEY,
      ownerId: OWNER_ID,
      fetch: hangingFetch,
      timeoutMs: TIMEOUT_MS,
    });

  it.each([
    [
      "create",
      (provider: ReturnType<typeof createRenderProvider>) =>
        provider.create({ name: NAME, spec: NATIVE_SPEC, secrets: SECRETS }),
    ],
    [
      "update",
      (provider: ReturnType<typeof createRenderProvider>) =>
        provider.update("srv-abc", { spec: NATIVE_SPEC, secrets: SECRETS }),
    ],
    ["status", (provider: ReturnType<typeof createRenderProvider>) => provider.status("srv-abc")],
    ["remove", (provider: ReturnType<typeof createRenderProvider>) => provider.remove("srv-abc")],
  ] as const)(
    "returns an error from %s when Render does not answer in time",
    async (_name, run) => {
      const provider = hangingProvider();

      const result = await run(provider);

      expect(result.ok).toBe(false);
    },
    TEST_TIMEOUT_MS,
  );
});

describe("createRenderProvider — service URL", () => {
  it.each([["http://x.onrender.com"], ["javascript:alert(1)"], ["not a url"]])(
    "drops a service URL that is not https: %s",
    async (url) => {
      const { provider } = providerWith(() => createdService("srv-xyz", url));

      const result = await provider.create({ name: NAME, spec: NATIVE_SPEC, secrets: SECRETS });

      expect(result).toEqual({ ok: true, value: { serviceId: "srv-xyz" } });
    },
  );

  it("keeps an https service URL", async () => {
    const { provider } = providerWith(() => createdService("srv-xyz", "https://x.onrender.com"));

    const result = await provider.create({ name: NAME, spec: NATIVE_SPEC, secrets: SECRETS });

    expect(result).toEqual({
      ok: true,
      value: { serviceId: "srv-xyz", url: "https://x.onrender.com" },
    });
  });
});
