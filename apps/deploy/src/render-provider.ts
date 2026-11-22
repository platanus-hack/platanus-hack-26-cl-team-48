import { err, ok, parse, type Result } from "@nodomics/protocol";
import { Type } from "@sinclair/typebox";
import { envValuesOf } from "./env-values.ts";
import type { HostingProvider, ProviderError } from "./hosting-provider.ts";
import type { BuildSpec, DeploymentStatus, ServiceSpec } from "./types.ts";

const RENDER_API_URL = "https://api.render.com/v1";
/** Nodomics fixes plan, region and auto-deploy; users never choose them (ADR 0027 §4). */
const FREE_PLAN = "free";
const REGION = "oregon";
const AUTO_DEPLOY_OFF = "no";
const SUSPENDED = "suspended";

const DEPLOY_STATUSES: Readonly<Record<string, DeploymentStatus>> = {
  live: "live",
  created: "deploying",
  queued: "deploying",
  build_in_progress: "deploying",
  update_in_progress: "deploying",
  pre_deploy_in_progress: "deploying",
  build_failed: "failed",
  update_failed: "failed",
  pre_deploy_failed: "failed",
  canceled: "failed",
  deactivated: "failed",
};

const CreatedService = Type.Object({
  service: Type.Object({
    id: Type.String({ minLength: 1 }),
    serviceDetails: Type.Optional(Type.Object({ url: Type.Optional(Type.String()) })),
  }),
});
const ServiceState = Type.Object({ suspended: Type.Optional(Type.String()) });
const DeployList = Type.Array(Type.Object({ deploy: Type.Object({ status: Type.String() }) }));

type RenderCall = (
  method: string,
  path: string,
  body?: unknown,
) => Promise<Result<unknown, ProviderError>>;

/** Adapts the Render REST API to the HostingProvider port. Never throws, never echoes the API key. */
export function createRenderProvider(options: {
  readonly apiKey: string;
  readonly ownerId: string;
  readonly fetch: typeof fetch;
  readonly baseUrl?: string;
}): HostingProvider {
  const call = renderClient(options);
  return {
    create: async ({ name, spec, secrets }) => {
      const response = await call("POST", "/services", {
        type: spec.build.kind === "static" ? "static_site" : "web_service",
        name,
        ownerId: options.ownerId,
        ...serviceFieldsOf(spec),
        envVars: envValuesOf(spec.env, secrets),
      });
      return response.ok ? createdServiceOf(response.value) : response;
    },
    update: async (serviceId, { spec, secrets }) => {
      const path = servicePath(serviceId);
      const patched = await call("PATCH", path, serviceFieldsOf(spec));
      if (!patched.ok) return patched;
      const replaced = await call("PUT", `${path}/env-vars`, envValuesOf(spec.env, secrets));
      if (!replaced.ok) return replaced;
      const deployed = await call("POST", `${path}/deploys`, {});
      return deployed.ok ? ok(undefined) : deployed;
    },
    status: (serviceId) => statusOf(call, serviceId),
    remove: async (serviceId) => {
      const removed = await call("DELETE", servicePath(serviceId));
      return removed.ok ? ok(undefined) : removed;
    },
  };
}

function renderClient(options: {
  readonly apiKey: string;
  readonly fetch: typeof fetch;
  readonly baseUrl?: string;
}): RenderCall {
  const baseUrl = (options.baseUrl ?? RENDER_API_URL).replace(/\/$/, "");
  return async (method, path, body) => {
    try {
      const response = await options.fetch(`${baseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${options.apiKey}`,
          Accept: "application/json",
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      // Render's error bodies may echo the request, secrets included, so they are never forwarded.
      if (!response.ok)
        return err({ message: `Render answered ${String(response.status)} to ${method} ${path}` });
      const text = await response.text();
      return ok(text === "" ? undefined : JSON.parse(text));
    } catch {
      return err({ message: `Render could not complete ${method} ${path}` });
    }
  };
}

async function statusOf(
  call: RenderCall,
  serviceId: string,
): Promise<Result<DeploymentStatus, ProviderError>> {
  const service = await call("GET", servicePath(serviceId));
  if (!service.ok) return service;
  const state = parse(ServiceState, service.value);
  if (state.ok && state.value.suspended === SUSPENDED) return ok("suspended");
  const deploys = await call("GET", `${servicePath(serviceId)}/deploys?limit=1`);
  if (!deploys.ok) return deploys;
  const list = parse(DeployList, deploys.value);
  if (!list.ok) return err({ message: "Render answered an unexpected list of deploys" });
  const latest = list.value[0];
  return ok(
    latest === undefined ? "creating" : (DEPLOY_STATUSES[latest.deploy.status] ?? "deploying"),
  );
}

function createdServiceOf(
  body: unknown,
): Result<{ readonly serviceId: string; readonly url?: string }, ProviderError> {
  const created = parse(CreatedService, body);
  if (!created.ok) return err({ message: "Render answered without a service id" });
  const url = created.value.service.serviceDetails?.url;
  return ok({ serviceId: created.value.service.id, ...(url === undefined ? {} : { url }) });
}

const servicePath = (serviceId: string): string => `/services/${encodeURIComponent(serviceId)}`;

function serviceFieldsOf(spec: ServiceSpec) {
  return {
    repo: spec.repo.url,
    branch: spec.repo.branch,
    ...(spec.repo.rootDir === undefined ? {} : { rootDir: spec.repo.rootDir }),
    autoDeploy: AUTO_DEPLOY_OFF,
    serviceDetails: serviceDetailsOf(spec.build, spec.healthCheckPath),
  };
}

function serviceDetailsOf(build: BuildSpec, healthCheckPath: string | undefined) {
  if (build.kind === "static")
    return {
      ...(build.buildCommand === undefined ? {} : { buildCommand: build.buildCommand }),
      publishPath: build.publishPath,
    };
  return {
    runtime: build.kind === "docker" ? "docker" : build.runtime,
    plan: FREE_PLAN,
    region: REGION,
    ...(healthCheckPath === undefined ? {} : { healthCheckPath }),
    envSpecificDetails: envSpecificDetailsOf(build),
  };
}

function envSpecificDetailsOf(build: Exclude<BuildSpec, { kind: "static" }>) {
  return build.kind === "docker"
    ? { dockerfilePath: build.dockerfilePath, dockerContext: build.dockerContext }
    : {
        ...(build.buildCommand === undefined ? {} : { buildCommand: build.buildCommand }),
        startCommand: build.startCommand,
      };
}
