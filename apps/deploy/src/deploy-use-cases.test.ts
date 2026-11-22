import { err, ok, type Flow } from "@nodomics/protocol";
import { describe, expect, it } from "vitest";
import { createDeployUseCases, type DeployUseCases } from "./deploy-use-cases.ts";
import type { DeploymentRecord, DeploymentStore } from "./deployment-store.ts";
import { createMemoryFlowReader, type FlowReader } from "./flow-reader.ts";
import type { HostingProvider } from "./hosting-provider.ts";
import { createMemoryDeploymentStore } from "./memory-deployment-store.ts";
import { createMemoryHostingProvider } from "./memory-hosting-provider.ts";
import { hashSpec } from "./spec/plan.ts";
import { serviceSpecOf } from "./spec/service-spec.ts";
import { deployFlow } from "./testing/deploy-flows.ts";
import type { DeploymentStatus, ServiceSpec, UserIdentity } from "./types.ts";

const ALICE: UserIdentity = {
  userId: "3F2A9C1E-77aa-4b4b-9e0d-123456789abc",
  accessToken: "alice-token",
};
const BOB: UserIdentity = {
  userId: "b0b5e7a1-1111-4222-8333-444455556666",
  accessToken: "bob-token",
};
const NOW = new Date("2026-11-22T10:00:00.000Z");
const SECRET_VALUE = "ghp_top_secret_value";
const SECRETS = { "github-token": SECRET_VALUE };
const ENV = [
  { name: "NODE_ENV", value: "production" },
  { name: "API_TOKEN", secret: "github-token" },
];
const FLOW = deployFlow({ service: { env: ENV } });
const SERVICE_NAME = /^nd-3f2a9c1e-web-[0-9a-f]{6}$/;

type Overrides = {
  readonly provider?: Partial<HostingProvider>;
  readonly store?: Partial<DeploymentStore>;
  readonly reader?: FlowReader;
  readonly now?: () => Date;
  readonly reportOrphan?: (serviceId: string) => void;
};

function fakeFlows() {
  const flows = new Map<string, Flow>();
  const reads: { userId: string; accessToken: string; flowId: string }[] = [];
  const keyOf = (userId: string, flowId: string) => `${userId}/${flowId}`;
  const reader: FlowReader = {
    read: (identity, flowId) => {
      reads.push({ ...identity, flowId });
      return Promise.resolve(ok(flows.get(keyOf(identity.userId, flowId))));
    },
  };
  const set = (identity: UserIdentity, flowId: string, flow: Flow) =>
    flows.set(keyOf(identity.userId, flowId), flow);
  const remove = (identity: UserIdentity, flowId: string) =>
    flows.delete(keyOf(identity.userId, flowId));
  return { reader, set, remove, reads };
}

function recordingProvider() {
  const memory = createMemoryHostingProvider();
  const calls: string[] = [];
  const createdNames: string[] = [];
  const provider: HostingProvider = {
    create: (input) => {
      calls.push("create");
      createdNames.push(input.name);
      return memory.create(input);
    },
    update: (serviceId, input) => {
      calls.push(`update ${serviceId}`);
      return memory.update(serviceId, input);
    },
    status: (serviceId) => {
      calls.push(`status ${serviceId}`);
      return memory.status(serviceId);
    },
    remove: (serviceId) => {
      calls.push(`remove ${serviceId}`);
      return memory.remove(serviceId);
    },
  };
  return { provider, calls, createdNames, services: memory.services };
}

function delegatingStore(store: DeploymentStore, overrides: Partial<DeploymentStore> = {}) {
  const deployments: DeploymentStore = {
    findByNode: (ownerId, flowId, nodeId) => store.findByNode(ownerId, flowId, nodeId),
    listByFlow: (ownerId, flowId) => store.listByFlow(ownerId, flowId),
    get: (ownerId, id) => store.get(ownerId, id),
    countByOwner: (ownerId) => store.countByOwner(ownerId),
    countAll: () => store.countAll(),
    save: (record) => store.save(record),
    remove: (id) => store.remove(id),
    updateStatus: (id, status, updatedAt) => store.updateStatus(id, status, updatedAt),
    ...overrides,
  };
  return deployments;
}

function setup(overrides: Overrides = {}) {
  const flows = fakeFlows();
  flows.set(ALICE, "flow-1", FLOW);
  const recording = recordingProvider();
  const store = createMemoryDeploymentStore();
  let nextId = 0;
  const useCases = createDeployUseCases({
    flows: overrides.reader ?? flows.reader,
    deployments: delegatingStore(store, overrides.store),
    provider: { ...recording.provider, ...overrides.provider },
    now: overrides.now ?? (() => NOW),
    createId: () => `dep-${String((nextId += 1))}`,
    ...(overrides.reportOrphan === undefined ? {} : { reportOrphan: overrides.reportOrphan }),
  });
  return { useCases, flows, store, ...recording };
}

const SPEC: ServiceSpec = {
  repo: { url: "https://github.com/nodomics/demo-app", branch: "main" },
  build: { kind: "native", runtime: "node", buildCommand: "npm ci", startCommand: "npm start" },
  env: [],
};

const recordOf = (overrides: Partial<DeploymentRecord>): DeploymentRecord => ({
  id: "seed",
  ownerId: ALICE.userId,
  flowId: "other-flow",
  nodeId: "web",
  providerServiceId: "srv-seed",
  spec: SPEC,
  specHash: hashSpec(SPEC),
  status: "live",
  updatedAt: "2026-11-01T00:00:00.000Z",
  ...overrides,
});

const specOfFlow = (flow: Flow, nodeId = "web"): ServiceSpec => {
  const result = serviceSpecOf(flow, nodeId);
  if (!result.ok) throw new Error(`Invalid test flow: ${result.error.code}`);
  return result.value;
};

async function planHashOf(useCases: DeployUseCases, identity = ALICE, flowId = "flow-1") {
  const result = await useCases.plan(identity, { flowId, nodeId: "web" });
  if (!result.ok) throw new Error(`Expected a plan, got ${result.error.code}`);
  return result.value.hash;
}

async function deployOnce(useCases: DeployUseCases) {
  const planHash = await planHashOf(useCases);
  const result = await useCases.apply(ALICE, {
    flowId: "flow-1",
    nodeId: "web",
    planHash,
    secrets: SECRETS,
  });
  if (!result.ok) throw new Error(`Expected a deployment, got ${result.error.code}`);
  return result.value;
}

const codeOf = (result: { ok: boolean; error?: { code: string } }): string | undefined =>
  result.ok ? undefined : result.error?.code;

describe("plan", () => {
  it("plans a create for a service that was never deployed", async () => {
    const { useCases } = setup();

    const result = await useCases.plan(ALICE, { flowId: "flow-1", nodeId: "web" });

    expect(result).toMatchObject({ ok: true, value: { action: "create" } });
    expect(result.ok ? result.value.hash : "").toBe(hashSpec(specOfFlow(FLOW)));
    expect(result.ok ? result.value.spec : undefined).toEqual(specOfFlow(FLOW));
  });

  it("reads the saved flow with the identity of the user", async () => {
    const { useCases, flows } = setup();

    await useCases.plan(ALICE, { flowId: "flow-1", nodeId: "web" });

    expect(flows.reads).toEqual([
      { userId: ALICE.userId, accessToken: ALICE.accessToken, flowId: "flow-1" },
    ]);
  });

  it("fails with FLOW_NOT_FOUND when the flow does not exist", async () => {
    const { useCases } = setup();

    const result = await useCases.plan(ALICE, { flowId: "missing", nodeId: "web" });

    expect(codeOf(result)).toBe("FLOW_NOT_FOUND");
  });

  it("fails with FLOW_NOT_FOUND when the flow belongs to another user", async () => {
    const reader = createMemoryFlowReader({ [ALICE.userId]: { "flow-1": FLOW } });
    const { useCases } = setup({ reader });

    const result = await useCases.plan(BOB, { flowId: "flow-1", nodeId: "web" });

    expect(codeOf(result)).toBe("FLOW_NOT_FOUND");
  });

  it("reads the owner's flow from the in-memory reader", async () => {
    const reader = createMemoryFlowReader({ [ALICE.userId]: { "flow-1": FLOW } });
    const { useCases } = setup({ reader });

    const result = await useCases.plan(ALICE, { flowId: "flow-1", nodeId: "web" });

    expect(result).toMatchObject({ ok: true, value: { action: "create" } });
  });

  it("returns the spec error of the node", async () => {
    const { useCases } = setup();

    const result = await useCases.plan(ALICE, { flowId: "flow-1", nodeId: "repo" });

    expect(codeOf(result)).toBe("NOT_A_SERVICE");
  });

  it("plans unchanged after deploying the same spec", async () => {
    const { useCases } = setup();
    await deployOnce(useCases);

    const result = await useCases.plan(ALICE, { flowId: "flow-1", nodeId: "web" });

    expect(result).toMatchObject({ ok: true, value: { action: "unchanged", changes: [] } });
  });

  it("plans an update listing what changed after the flow was edited", async () => {
    const { useCases, flows } = setup();
    await deployOnce(useCases);
    flows.set(ALICE, "flow-1", deployFlow({ repo: { branch: "release" }, service: { env: ENV } }));

    const result = await useCases.plan(ALICE, { flowId: "flow-1", nodeId: "web" });

    expect(result).toMatchObject({ ok: true, value: { action: "update" } });
    expect(result.ok ? result.value.changes.map((change) => change.field) : []).toEqual(["repo"]);
  });

  it("ignores another user's deployment of the same flow and node ids", async () => {
    const { useCases, store } = setup();
    await store.save(
      recordOf({
        ownerId: BOB.userId,
        flowId: "flow-1",
        nodeId: "web",
        spec: specOfFlow(FLOW),
        specHash: hashSpec(specOfFlow(FLOW)),
      }),
    );

    const result = await useCases.plan(ALICE, { flowId: "flow-1", nodeId: "web" });

    expect(result).toMatchObject({ ok: true, value: { action: "create" } });
  });

  it("fails with QUOTA_USER when the user already has two services", async () => {
    const { useCases, store } = setup();
    await store.save(recordOf({ id: "a1", flowId: "other-1" }));
    await store.save(recordOf({ id: "a2", flowId: "other-2" }));

    const result = await useCases.plan(ALICE, { flowId: "flow-1", nodeId: "web" });

    expect(codeOf(result)).toBe("QUOTA_USER");
  });

  it("fails with QUOTA_TOTAL when there are twenty services in total", async () => {
    const { useCases, store } = setup();
    for (let index = 0; index < 20; index += 1)
      await store.save(
        recordOf({ id: `other-${String(index)}`, ownerId: `user-${String(index)}` }),
      );

    const result = await useCases.plan(ALICE, { flowId: "flow-1", nodeId: "web" });

    expect(codeOf(result)).toBe("QUOTA_TOTAL");
  });

  it("allows an update when the user is at the quota", async () => {
    const { useCases, store } = setup();
    await store.save(recordOf({ id: "a1", flowId: "flow-1", nodeId: "web" }));
    await store.save(recordOf({ id: "a2", flowId: "other-2" }));

    const result = await useCases.plan(ALICE, { flowId: "flow-1", nodeId: "web" });

    expect(result).toMatchObject({ ok: true, value: { action: "update" } });
  });

  it("fails with UNAVAILABLE when the flow cannot be read", async () => {
    const reader: FlowReader = { read: () => Promise.resolve(err({ message: "Supabase down" })) };
    const { useCases } = setup({ reader });

    const result = await useCases.plan(ALICE, { flowId: "flow-1", nodeId: "web" });

    expect(codeOf(result)).toBe("UNAVAILABLE");
  });

  const storeDown = () => Promise.resolve(err({ message: "Supabase down" }));

  it.each<[string, Partial<DeploymentStore>]>([
    ["findByNode", { findByNode: storeDown }],
    ["countByOwner", { countByOwner: storeDown }],
    ["countAll", { countAll: storeDown }],
  ])("fails with UNAVAILABLE when the store fails in %s", async (_method, store) => {
    const { useCases } = setup({ store });

    const result = await useCases.plan(ALICE, { flowId: "flow-1", nodeId: "web" });

    expect(codeOf(result)).toBe("UNAVAILABLE");
  });
});

describe("apply — create", () => {
  it("creates the service and returns a deploying deployment", async () => {
    const { useCases, createdNames } = setup();
    const planHash = await planHashOf(useCases);

    const result = await useCases.apply(ALICE, {
      flowId: "flow-1",
      nodeId: "web",
      planHash,
      secrets: SECRETS,
    });

    expect(result).toEqual({
      ok: true,
      value: {
        id: "dep-1",
        flowId: "flow-1",
        nodeId: "web",
        url: `https://${createdNames[0] ?? ""}.onrender.com`,
        status: "deploying",
        updatedAt: NOW.toISOString(),
      },
    });
  });

  it("names the service after a short user id, the node id and a short hash of the flow", async () => {
    const { useCases, createdNames } = setup();

    await deployOnce(useCases);

    expect(createdNames).toHaveLength(1);
    expect(createdNames[0]).toMatch(SERVICE_NAME);
  });

  it("gives the same name to the same flow and node every time", async () => {
    const first = setup();
    const second = setup();

    await deployOnce(first.useCases);
    await deployOnce(second.useCases);

    expect(first.createdNames[0]).toMatch(SERVICE_NAME);
    expect(second.createdNames).toEqual(first.createdNames);
  });

  it("gives different names to the same node id in two flows of the same user", async () => {
    const { useCases, flows, createdNames } = setup();
    flows.set(ALICE, "flow-2", FLOW);
    await deployOnce(useCases);

    await useCases.apply(ALICE, {
      flowId: "flow-2",
      nodeId: "web",
      planHash: await planHashOf(useCases, ALICE, "flow-2"),
      secrets: SECRETS,
    });

    expect(createdNames).toHaveLength(2);
    expect(createdNames[1]).toMatch(SERVICE_NAME);
    expect(createdNames[1]).not.toBe(createdNames[0]);
  });

  it("sanitizes and shortens the node id in the service name", async () => {
    const { useCases, flows, createdNames } = setup();
    const nodeId = "Web_Service.Main.With.A.Very.Long.Name";
    flows.set(ALICE, "flow-2", deployFlow({ serviceId: nodeId }));
    const plan = await useCases.plan(ALICE, { flowId: "flow-2", nodeId });

    await useCases.apply(ALICE, {
      flowId: "flow-2",
      nodeId,
      planHash: plan.ok ? plan.value.hash : "",
      secrets: {},
    });

    expect(createdNames).toHaveLength(1);
    expect(createdNames[0]).toMatch(/^nd-3f2a9c1e-[a-z0-9-]{1,12}-[0-9a-f]{6}$/);
  });

  it("passes the spec with literal values and resolved secrets to the provider", async () => {
    const { useCases, services } = setup();

    await deployOnce(useCases);

    expect(services.get("srv-1")?.spec).toEqual(specOfFlow(FLOW));
    expect(services.get("srv-1")?.env).toEqual({ NODE_ENV: "production", API_TOKEN: SECRET_VALUE });
  });

  it("saves a record of the deployment for its owner", async () => {
    const { useCases, store } = setup();

    await deployOnce(useCases);

    expect(await store.findByNode(ALICE.userId, "flow-1", "web")).toMatchObject({
      ok: true,
      value: {
        id: "dep-1",
        ownerId: ALICE.userId,
        flowId: "flow-1",
        nodeId: "web",
        providerServiceId: "srv-1",
        specHash: hashSpec(specOfFlow(FLOW)),
        status: "deploying",
      },
    });
  });

  it("never saves the secret values in the record", async () => {
    const { useCases, store } = setup();

    await deployOnce(useCases);

    expect(JSON.stringify(await store.listByFlow(ALICE.userId, "flow-1"))).not.toContain(
      SECRET_VALUE,
    );
  });

  it("never returns the secret values or internal fields in the deployment", async () => {
    const { useCases } = setup();

    const deployment = await deployOnce(useCases);

    expect(JSON.stringify(deployment)).not.toContain(SECRET_VALUE);
    expect(Object.keys(deployment).sort()).toEqual(
      ["flowId", "id", "nodeId", "status", "updatedAt", "url"].sort(),
    );
  });

  it("fails with MISSING_SECRET without calling the provider when a secret has no value", async () => {
    const { useCases, calls } = setup();
    const planHash = await planHashOf(useCases);

    const result = await useCases.apply(ALICE, {
      flowId: "flow-1",
      nodeId: "web",
      planHash,
      secrets: { "another-secret": "x" },
    });

    expect(codeOf(result)).toBe("MISSING_SECRET");
    expect(calls).toEqual([]);
  });

  it("fails with PLAN_CHANGED when the hash does not match the current plan", async () => {
    const { useCases, calls } = setup();

    const result = await useCases.apply(ALICE, {
      flowId: "flow-1",
      nodeId: "web",
      planHash: "stale-hash",
      secrets: SECRETS,
    });

    expect(codeOf(result)).toBe("PLAN_CHANGED");
    expect(calls).toEqual([]);
  });

  it("fails with PLAN_CHANGED when the flow changed after planning", async () => {
    const { useCases, flows, calls } = setup();
    const planHash = await planHashOf(useCases);
    flows.set(ALICE, "flow-1", deployFlow({ repo: { branch: "release" }, service: { env: ENV } }));

    const result = await useCases.apply(ALICE, {
      flowId: "flow-1",
      nodeId: "web",
      planHash,
      secrets: SECRETS,
    });

    expect(codeOf(result)).toBe("PLAN_CHANGED");
    expect(calls).toEqual([]);
  });

  it("fails with QUOTA_USER without calling the provider when the user is at the quota", async () => {
    const { useCases, store, calls } = setup();
    await store.save(recordOf({ id: "a1", flowId: "other-1" }));
    await store.save(recordOf({ id: "a2", flowId: "other-2" }));

    const result = await useCases.apply(ALICE, {
      flowId: "flow-1",
      nodeId: "web",
      planHash: hashSpec(specOfFlow(FLOW)),
      secrets: SECRETS,
    });

    expect(codeOf(result)).toBe("QUOTA_USER");
    expect(calls).toEqual([]);
  });

  it("fails with FLOW_NOT_FOUND when applying on another user's flow", async () => {
    const { useCases, calls } = setup();

    const result = await useCases.apply(BOB, {
      flowId: "flow-1",
      nodeId: "web",
      planHash: hashSpec(specOfFlow(FLOW)),
      secrets: SECRETS,
    });

    expect(codeOf(result)).toBe("FLOW_NOT_FOUND");
    expect(calls).toEqual([]);
  });

  it("fails with PROVIDER_ERROR and saves nothing when the provider cannot create", async () => {
    const { useCases, store } = setup({
      provider: { create: () => Promise.resolve(err({ message: "Render is down" })) },
    });
    const planHash = await planHashOf(useCases);

    const result = await useCases.apply(ALICE, {
      flowId: "flow-1",
      nodeId: "web",
      planHash,
      secrets: SECRETS,
    });

    expect(codeOf(result)).toBe("PROVIDER_ERROR");
    expect(await store.countAll()).toEqual({ ok: true, value: 0 });
  });
});

describe("apply — update and unchanged", () => {
  const EDITED_FLOW = deployFlow({ repo: { branch: "release" }, service: { env: ENV } });

  it("updates the existing service instead of creating another one", async () => {
    const { useCases, flows, calls, services } = setup();
    await deployOnce(useCases);
    flows.set(ALICE, "flow-1", EDITED_FLOW);

    const result = await useCases.apply(ALICE, {
      flowId: "flow-1",
      nodeId: "web",
      planHash: await planHashOf(useCases),
      secrets: SECRETS,
    });

    expect(result).toMatchObject({ ok: true, value: { id: "dep-1" } });
    expect(calls).toEqual(["create", "update srv-1"]);
    expect(services.size).toBe(1);
    expect(services.get("srv-1")?.spec.repo.branch).toBe("release");
  });

  it("saves the new spec hash after an update", async () => {
    const { useCases, flows, store } = setup();
    await deployOnce(useCases);
    flows.set(ALICE, "flow-1", EDITED_FLOW);

    await useCases.apply(ALICE, {
      flowId: "flow-1",
      nodeId: "web",
      planHash: await planHashOf(useCases),
      secrets: SECRETS,
    });

    expect(await store.findByNode(ALICE.userId, "flow-1", "web")).toMatchObject({
      ok: true,
      value: { specHash: hashSpec(specOfFlow(EDITED_FLOW)) },
    });
  });

  it("keeps the previous record when the provider cannot update", async () => {
    const { useCases, flows, store } = setup({
      provider: { update: () => Promise.resolve(err({ message: "Render is down" })) },
    });
    await deployOnce(useCases);
    flows.set(ALICE, "flow-1", EDITED_FLOW);

    const result = await useCases.apply(ALICE, {
      flowId: "flow-1",
      nodeId: "web",
      planHash: await planHashOf(useCases),
      secrets: SECRETS,
    });

    expect(codeOf(result)).toBe("PROVIDER_ERROR");
    expect(await store.findByNode(ALICE.userId, "flow-1", "web")).toMatchObject({
      ok: true,
      value: { specHash: hashSpec(specOfFlow(FLOW)) },
    });
  });

  it("returns the current deployment without calling the provider when nothing changed", async () => {
    const { useCases, calls } = setup();
    const deployed = await deployOnce(useCases);

    const result = await useCases.apply(ALICE, {
      flowId: "flow-1",
      nodeId: "web",
      planHash: await planHashOf(useCases),
      secrets: SECRETS,
    });

    expect(result).toEqual({ ok: true, value: deployed });
    expect(calls).toEqual(["create"]);
  });
});

describe("list", () => {
  it("returns the user's deployments of the flow with the status refreshed", async () => {
    const { useCases, createdNames } = setup();
    await deployOnce(useCases);

    const result = await useCases.list(ALICE, "flow-1");

    expect(result).toEqual({
      ok: true,
      value: [
        {
          id: "dep-1",
          flowId: "flow-1",
          nodeId: "web",
          url: `https://${createdNames[0] ?? ""}.onrender.com`,
          status: "live",
          updatedAt: NOW.toISOString(),
        },
      ],
    });
  });

  it("saves a refreshed status that changed", async () => {
    const { useCases, store } = setup();
    await deployOnce(useCases);

    await useCases.list(ALICE, "flow-1");

    expect(await store.findByNode(ALICE.userId, "flow-1", "web")).toMatchObject({
      ok: true,
      value: { status: "live" },
    });
  });

  it("returns nothing for a flow without deployments", async () => {
    const { useCases } = setup();

    const result = await useCases.list(ALICE, "flow-1");

    expect(result).toEqual({ ok: true, value: [] });
  });

  it("never lists deployments of other users or other flows", async () => {
    const { useCases, store } = setup();
    await store.save(recordOf({ id: "bob-1", ownerId: BOB.userId, flowId: "flow-1" }));
    await store.save(recordOf({ id: "alice-other", flowId: "flow-2" }));

    const result = await useCases.list(ALICE, "flow-1");

    expect(result).toEqual({ ok: true, value: [] });
  });

  it("keeps the last known status when the provider cannot report it", async () => {
    const { useCases } = setup({
      provider: { status: () => Promise.resolve(err({ message: "Render is down" })) },
    });
    await deployOnce(useCases);

    const result = await useCases.list(ALICE, "flow-1");

    expect(result).toMatchObject({ ok: true, value: [{ id: "dep-1", status: "deploying" }] });
  });

  it("fails with UNAVAILABLE when the store cannot list", async () => {
    const { useCases } = setup({
      store: { listByFlow: () => Promise.resolve(err({ message: "Supabase down" })) },
    });

    const result = await useCases.list(ALICE, "flow-1");

    expect(codeOf(result)).toBe("UNAVAILABLE");
  });
});

describe("remove", () => {
  it("removes the service from the provider and forgets the deployment", async () => {
    const { useCases, calls, services } = setup();
    const deployment = await deployOnce(useCases);

    const result = await useCases.remove(ALICE, deployment.id);

    expect(result.ok).toBe(true);
    expect(calls).toContain("remove srv-1");
    expect(services.size).toBe(0);
    expect(await useCases.list(ALICE, "flow-1")).toEqual({ ok: true, value: [] });
  });

  it("fails with DEPLOYMENT_NOT_FOUND for another user's deployment and leaves it alone", async () => {
    const { useCases, calls, services } = setup();
    const deployment = await deployOnce(useCases);

    const result = await useCases.remove(BOB, deployment.id);

    expect(codeOf(result)).toBe("DEPLOYMENT_NOT_FOUND");
    expect(calls).not.toContain("remove srv-1");
    expect(services.size).toBe(1);
  });

  it("fails with DEPLOYMENT_NOT_FOUND for an unknown id", async () => {
    const { useCases } = setup();

    const result = await useCases.remove(ALICE, "dep-404");

    expect(codeOf(result)).toBe("DEPLOYMENT_NOT_FOUND");
  });

  it("fails with PROVIDER_ERROR when the provider cannot remove the service", async () => {
    const { useCases } = setup({
      provider: { remove: () => Promise.resolve(err({ message: "Render is down" })) },
    });
    const deployment = await deployOnce(useCases);

    const result = await useCases.remove(ALICE, deployment.id);

    expect(codeOf(result)).toBe("PROVIDER_ERROR");
  });
});

/** Lets the event loop run once, so that calls started together overlap inside the provider. */
const nextTick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/** A provider whose create resolves only after a tick, counting how many times it was called. */
function slowCreateProvider() {
  const memory = createMemoryHostingProvider();
  const created: string[] = [];
  const provider: Partial<HostingProvider> = {
    create: async (input) => {
      created.push(input.name);
      await nextTick();
      return memory.create(input);
    },
  };
  return { provider, created };
}

async function applyCreate(useCases: DeployUseCases, flowId: string) {
  return useCases.apply(ALICE, {
    flowId,
    nodeId: "web",
    planHash: hashSpec(specOfFlow(FLOW)),
    secrets: SECRETS,
  });
}

describe("apply — quotas under concurrency", () => {
  it("lets only one of two parallel creates through when the user has one slot left", async () => {
    const slow = slowCreateProvider();
    const { useCases, flows, store } = setup({ provider: slow.provider });
    flows.set(ALICE, "flow-2", FLOW);
    flows.set(ALICE, "flow-3", FLOW);
    await store.save(recordOf({ id: "a1", flowId: "other-1" }));

    const results = await Promise.all([
      applyCreate(useCases, "flow-2"),
      applyCreate(useCases, "flow-3"),
    ]);

    expect(results.map(codeOf).sort()).toEqual(["QUOTA_USER", undefined]);
    expect(slow.created).toHaveLength(1);
    expect(await store.countByOwner(ALICE.userId)).toEqual({ ok: true, value: 2 });
  });

  it("lets only one of two parallel creates through when there is one slot left in total", async () => {
    const slow = slowCreateProvider();
    const { useCases, flows, store } = setup({ provider: slow.provider });
    flows.set(ALICE, "flow-2", FLOW);
    flows.set(ALICE, "flow-3", FLOW);
    for (let index = 0; index < 19; index += 1)
      await store.save(
        recordOf({ id: `other-${String(index)}`, ownerId: `user-${String(index)}` }),
      );

    const results = await Promise.all([
      applyCreate(useCases, "flow-2"),
      applyCreate(useCases, "flow-3"),
    ]);

    expect(results.map(codeOf).sort()).toEqual(["QUOTA_TOTAL", undefined]);
    expect(slow.created).toHaveLength(1);
    expect(await store.countAll()).toEqual({ ok: true, value: 20 });
  });

  it("still creates both services when two parallel creates fit in the quota", async () => {
    const slow = slowCreateProvider();
    const { useCases, flows } = setup({ provider: slow.provider });
    flows.set(ALICE, "flow-2", FLOW);
    flows.set(ALICE, "flow-3", FLOW);

    const results = await Promise.all([
      applyCreate(useCases, "flow-2"),
      applyCreate(useCases, "flow-3"),
    ]);

    expect(results.map(codeOf)).toEqual([undefined, undefined]);
    expect(slow.created).toHaveLength(2);
  });
});

describe("apply — orphan compensation", () => {
  it("fails with UNAVAILABLE and removes the created service when the record cannot be saved", async () => {
    const { useCases, calls, services } = setup({
      store: { save: () => Promise.resolve(err({ message: "Supabase down" })) },
    });
    const planHash = await planHashOf(useCases);

    const result = await useCases.apply(ALICE, {
      flowId: "flow-1",
      nodeId: "web",
      planHash,
      secrets: SECRETS,
    });

    expect(codeOf(result)).toBe("UNAVAILABLE");
    expect(calls).toEqual(["create", "remove srv-1"]);
    expect(services.size).toBe(0);
  });

  it("removes the service id that create returned", async () => {
    const removed: string[] = [];
    const { useCases } = setup({
      provider: {
        create: () => Promise.resolve(ok({ serviceId: "srv-orphan-42" })),
        remove: (serviceId) => {
          removed.push(serviceId);
          return Promise.resolve(ok(undefined));
        },
      },
      store: { save: () => Promise.resolve(err({ message: "Supabase down" })) },
    });
    const planHash = await planHashOf(useCases);

    const result = await useCases.apply(ALICE, {
      flowId: "flow-1",
      nodeId: "web",
      planHash,
      secrets: SECRETS,
    });

    expect(codeOf(result)).toBe("UNAVAILABLE");
    expect(removed).toEqual(["srv-orphan-42"]);
  });
});

describe("redeploy", () => {
  const EDITED_FLOW = deployFlow({ repo: { branch: "release" }, service: { env: ENV } });
  const LATER = new Date("2026-11-22T12:30:00.000Z");

  function movableClock() {
    let current = NOW;
    return { now: () => current, advanceTo: (date: Date) => (current = date) };
  }

  function updateRecorder() {
    const memory = createMemoryHostingProvider();
    const updates: { serviceId: string; input: { spec: ServiceSpec; secrets: unknown } }[] = [];
    const provider: Partial<HostingProvider> = {
      create: (input) => memory.create(input),
      update: (serviceId, input) => {
        updates.push({ serviceId, input });
        return memory.update(serviceId, input);
      },
      status: (serviceId) => memory.status(serviceId),
    };
    return { provider, updates };
  }

  it("fails with DEPLOYMENT_NOT_FOUND when the node was never deployed", async () => {
    const { useCases, calls } = setup();

    const result = await useCases.redeploy(ALICE, {
      flowId: "flow-1",
      nodeId: "web",
      secrets: SECRETS,
    });

    expect(codeOf(result)).toBe("DEPLOYMENT_NOT_FOUND");
    expect(calls).toEqual([]);
  });

  it("fails with PLAN_CHANGED without updating when the flow changed since the deploy", async () => {
    const { useCases, flows, calls } = setup();
    await deployOnce(useCases);
    flows.set(ALICE, "flow-1", EDITED_FLOW);

    const result = await useCases.redeploy(ALICE, {
      flowId: "flow-1",
      nodeId: "web",
      secrets: SECRETS,
    });

    expect(codeOf(result)).toBe("PLAN_CHANGED");
    expect(calls).toEqual(["create"]);
  });

  it("fails with MISSING_SECRET without updating when a secret has no value", async () => {
    const { useCases, calls } = setup();
    await deployOnce(useCases);

    const result = await useCases.redeploy(ALICE, {
      flowId: "flow-1",
      nodeId: "web",
      secrets: {},
    });

    expect(codeOf(result)).toBe("MISSING_SECRET");
    expect(calls).toEqual(["create"]);
  });

  it("updates the provider service with the deployed spec and the given secrets", async () => {
    const recorder = updateRecorder();
    const { useCases } = setup({ provider: recorder.provider });
    await deployOnce(useCases);

    await useCases.redeploy(ALICE, { flowId: "flow-1", nodeId: "web", secrets: SECRETS });

    expect(recorder.updates).toEqual([
      { serviceId: "srv-1", input: { spec: specOfFlow(FLOW), secrets: SECRETS } },
    ]);
  });

  it("returns the deployment as deploying with the current time", async () => {
    const clock = movableClock();
    const { useCases } = setup({ now: clock.now });
    const deployed = await deployOnce(useCases);
    await useCases.list(ALICE, "flow-1");
    clock.advanceTo(LATER);

    const result = await useCases.redeploy(ALICE, {
      flowId: "flow-1",
      nodeId: "web",
      secrets: SECRETS,
    });

    expect(result).toEqual({
      ok: true,
      value: { ...deployed, status: "deploying", updatedAt: LATER.toISOString() },
    });
  });

  it("saves the record as deploying with the current time and the same spec", async () => {
    const clock = movableClock();
    const { useCases, store } = setup({ now: clock.now });
    await deployOnce(useCases);
    await useCases.list(ALICE, "flow-1");
    clock.advanceTo(LATER);

    await useCases.redeploy(ALICE, { flowId: "flow-1", nodeId: "web", secrets: SECRETS });

    expect(await store.findByNode(ALICE.userId, "flow-1", "web")).toMatchObject({
      ok: true,
      value: {
        id: "dep-1",
        providerServiceId: "srv-1",
        specHash: hashSpec(specOfFlow(FLOW)),
        status: "deploying",
        updatedAt: LATER.toISOString(),
      },
    });
  });

  it("never saves the secret values in the record when redeploying", async () => {
    const { useCases, store } = setup();
    await deployOnce(useCases);

    await useCases.redeploy(ALICE, { flowId: "flow-1", nodeId: "web", secrets: SECRETS });

    expect(JSON.stringify(await store.listByFlow(ALICE.userId, "flow-1"))).not.toContain(
      SECRET_VALUE,
    );
  });

  it("fails with PROVIDER_ERROR when the provider cannot update", async () => {
    const { useCases } = setup({
      provider: { update: () => Promise.resolve(err({ message: "Render is down" })) },
    });
    await deployOnce(useCases);

    const result = await useCases.redeploy(ALICE, {
      flowId: "flow-1",
      nodeId: "web",
      secrets: SECRETS,
    });

    expect(codeOf(result)).toBe("PROVIDER_ERROR");
  });

  it("fails with FLOW_NOT_FOUND when the flow no longer exists", async () => {
    const { useCases, flows, calls } = setup();
    await deployOnce(useCases);
    flows.remove(ALICE, "flow-1");

    const result = await useCases.redeploy(ALICE, {
      flowId: "flow-1",
      nodeId: "web",
      secrets: SECRETS,
    });

    expect(codeOf(result)).toBe("FLOW_NOT_FOUND");
    expect(calls).toEqual(["create"]);
  });

  it("fails with FLOW_NOT_FOUND when redeploying another user's flow", async () => {
    const { useCases, calls } = setup();
    await deployOnce(useCases);

    const result = await useCases.redeploy(BOB, {
      flowId: "flow-1",
      nodeId: "web",
      secrets: SECRETS,
    });

    expect(codeOf(result)).toBe("FLOW_NOT_FOUND");
    expect(calls).toEqual(["create"]);
  });
});

describe("plan and apply — changing the kind of service", () => {
  const flowWithBuild = (build: Record<string, unknown>) =>
    deployFlow({ service: { env: ENV, ...build } });
  const STATIC_FLOW = flowWithBuild({ build: "static", publishPath: "dist" });
  const NATIVE_FLOW = flowWithBuild({ build: "native" });
  const DOCKER_FLOW = flowWithBuild({ build: "docker" });

  async function deployedAs(flow: Flow) {
    const context = setup();
    context.flows.set(ALICE, "flow-1", flow);
    await deployOnce(context.useCases);
    return context;
  }

  it.each<[string, Flow, Flow]>([
    ["static to native", STATIC_FLOW, NATIVE_FLOW],
    ["static to docker", STATIC_FLOW, DOCKER_FLOW],
    ["native to static", NATIVE_FLOW, STATIC_FLOW],
    ["docker to static", DOCKER_FLOW, STATIC_FLOW],
  ])("fails the plan with SERVICE_KIND_CHANGED from %s", async (_case, before, after) => {
    const { useCases, flows } = await deployedAs(before);
    flows.set(ALICE, "flow-1", after);

    const result = await useCases.plan(ALICE, { flowId: "flow-1", nodeId: "web" });

    expect(codeOf(result)).toBe("SERVICE_KIND_CHANGED");
  });

  it.each<[string, Flow, Flow]>([
    ["static to native", STATIC_FLOW, NATIVE_FLOW],
    ["native to static", NATIVE_FLOW, STATIC_FLOW],
  ])(
    "fails the apply with SERVICE_KIND_CHANGED from %s without calling the provider",
    async (_case, before, after) => {
      const { useCases, flows, calls } = await deployedAs(before);
      flows.set(ALICE, "flow-1", after);

      const result = await useCases.apply(ALICE, {
        flowId: "flow-1",
        nodeId: "web",
        planHash: hashSpec(specOfFlow(after)),
        secrets: SECRETS,
      });

      expect(codeOf(result)).toBe("SERVICE_KIND_CHANGED");
      expect(calls).toEqual(["create"]);
    },
  );

  it.each<[string, Flow, Flow]>([
    ["native to docker", NATIVE_FLOW, DOCKER_FLOW],
    ["docker to native", DOCKER_FLOW, NATIVE_FLOW],
  ])("plans a normal update from %s", async (_case, before, after) => {
    const { useCases, flows } = await deployedAs(before);
    flows.set(ALICE, "flow-1", after);

    const result = await useCases.plan(ALICE, { flowId: "flow-1", nodeId: "web" });

    expect(result).toMatchObject({ ok: true, value: { action: "update" } });
  });

  it("applies an update from native to docker on the same service", async () => {
    const { useCases, flows, calls } = await deployedAs(NATIVE_FLOW);
    flows.set(ALICE, "flow-1", DOCKER_FLOW);

    const result = await useCases.apply(ALICE, {
      flowId: "flow-1",
      nodeId: "web",
      planHash: hashSpec(specOfFlow(DOCKER_FLOW)),
      secrets: SECRETS,
    });

    expect(result.ok).toBe(true);
    expect(calls).toEqual(["create", "update srv-1"]);
  });
});

/** A provider status that stays pending until the test releases it with a status. */
function deferredStatus() {
  let release: (status: DeploymentStatus) => void = () => undefined;
  let markCalled: () => void = () => undefined;
  const called = new Promise<void>((resolve) => {
    markCalled = resolve;
  });
  const status: HostingProvider["status"] = () =>
    new Promise((resolve) => {
      release = (value) => {
        resolve(ok(value));
      };
      markCalled();
    });
  return {
    status,
    called,
    release: (value: DeploymentStatus) => {
      release(value);
    },
  };
}

const settle = async () => {
  for (let tick = 0; tick < 5; tick += 1) await nextTick();
};

describe("list — refreshing the status never overwrites concurrent changes", () => {
  const EDITED_FLOW = deployFlow({ repo: { branch: "release" }, service: { env: ENV } });

  it("does not bring back a deployment removed while its status was being refreshed", async () => {
    const deferred = deferredStatus();
    const { useCases, store } = setup({ provider: { status: deferred.status } });
    const deployment = await deployOnce(useCases);
    const listing = useCases.list(ALICE, "flow-1");
    await deferred.called;
    const removing = useCases.remove(ALICE, deployment.id);
    await settle();

    deferred.release("live");
    await Promise.all([listing, removing]);

    expect(await store.countByOwner(ALICE.userId)).toEqual({ ok: true, value: 0 });
    expect(await store.listByFlow(ALICE.userId, "flow-1")).toEqual({ ok: true, value: [] });
  });

  it("keeps the spec saved by an update applied while the status was being refreshed", async () => {
    const deferred = deferredStatus();
    const { useCases, flows, store } = setup({ provider: { status: deferred.status } });
    await deployOnce(useCases);
    const listing = useCases.list(ALICE, "flow-1");
    await deferred.called;
    flows.set(ALICE, "flow-1", EDITED_FLOW);
    const applying = useCases.apply(ALICE, {
      flowId: "flow-1",
      nodeId: "web",
      planHash: hashSpec(specOfFlow(EDITED_FLOW)),
      secrets: SECRETS,
    });
    await settle();

    deferred.release("live");
    const [, applied] = await Promise.all([listing, applying]);

    expect(applied.ok).toBe(true);
    expect(await store.findByNode(ALICE.userId, "flow-1", "web")).toMatchObject({
      ok: true,
      value: { spec: specOfFlow(EDITED_FLOW), specHash: hashSpec(specOfFlow(EDITED_FLOW)) },
    });
  });
});

describe("apply — reporting orphan services", () => {
  const saveDown = () => Promise.resolve(err({ message: "Supabase down" }));

  it("reports the created service as an orphan when it cannot be removed after the save failed", async () => {
    const orphans: string[] = [];
    const { useCases } = setup({
      provider: {
        create: () => Promise.resolve(ok({ serviceId: "srv-orphan-42" })),
        remove: () => Promise.resolve(err({ message: "Render is down" })),
      },
      store: { save: saveDown },
      reportOrphan: (serviceId) => orphans.push(serviceId),
    });

    const result = await applyCreate(useCases, "flow-1");

    expect(codeOf(result)).toBe("UNAVAILABLE");
    expect(orphans).toEqual(["srv-orphan-42"]);
  });

  it("reports no orphan when the created service is removed after the save failed", async () => {
    const orphans: string[] = [];
    const { useCases } = setup({
      store: { save: saveDown },
      reportOrphan: (serviceId) => orphans.push(serviceId),
    });

    const result = await applyCreate(useCases, "flow-1");

    expect(codeOf(result)).toBe("UNAVAILABLE");
    expect(orphans).toEqual([]);
  });
});

describe("stored urls", () => {
  const seededSpec = () => specOfFlow(FLOW);
  const seededRecord = (url: string) =>
    recordOf({
      flowId: "flow-1",
      nodeId: "web",
      url,
      spec: seededSpec(),
      specHash: hashSpec(seededSpec()),
    });
  const SEEDED_DEPLOYMENT = {
    id: "seed",
    flowId: "flow-1",
    nodeId: "web",
    status: "live",
    updatedAt: "2026-11-01T00:00:00.000Z",
  };
  const updateOk = () => Promise.resolve(ok(undefined));

  it.each(["http://old.onrender.com", "javascript:alert(1)"])(
    "lists a deployment stored with the url %s without its url",
    async (url) => {
      const { useCases, store } = setup();
      await store.save(seededRecord(url));

      const result = await useCases.list(ALICE, "flow-1");

      expect(result).toEqual({ ok: true, value: [SEEDED_DEPLOYMENT] });
    },
  );

  it("lists a deployment stored with an https url with that url", async () => {
    const { useCases, store } = setup();
    await store.save(seededRecord("https://seed.onrender.com"));

    const result = await useCases.list(ALICE, "flow-1");

    expect(result).toEqual({
      ok: true,
      value: [{ ...SEEDED_DEPLOYMENT, url: "https://seed.onrender.com" }],
    });
  });

  it.each(["http://old.onrender.com", "javascript:alert(1)"])(
    "redeploys a deployment stored with the url %s returning it without its url",
    async (url) => {
      const { useCases, store } = setup({ provider: { update: updateOk } });
      await store.save(seededRecord(url));

      const result = await useCases.redeploy(ALICE, {
        flowId: "flow-1",
        nodeId: "web",
        secrets: SECRETS,
      });

      expect(result.ok).toBe(true);
      expect(result.ok ? result.value : undefined).not.toHaveProperty("url");
    },
  );

  it("redeploys a deployment stored with an https url returning that url", async () => {
    const { useCases, store } = setup({ provider: { update: updateOk } });
    await store.save(seededRecord("https://seed.onrender.com"));

    const result = await useCases.redeploy(ALICE, {
      flowId: "flow-1",
      nodeId: "web",
      secrets: SECRETS,
    });

    expect(result).toMatchObject({ ok: true, value: { url: "https://seed.onrender.com" } });
  });
});
