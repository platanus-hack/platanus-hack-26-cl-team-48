import {
  NepNotifications,
  parse,
  type Flow,
  type NepEvent,
  type NepEventPayload,
  type NodeManifest,
} from "@nodomics/protocol";
import { describe, expect, it } from "vitest";
import { createCoordinator } from "./coordinator.ts";
import { coreCatalog, edge, flowNode, flowOf } from "./testing/catalog-fixtures.ts";
import { createHarness } from "./testing/coordinator-harness.ts";

const repoManifest: NodeManifest = {
  id: "core.deploy.repo",
  version: "0.1.0",
  name: "Repositorio",
  category: "Hosteo",
  inputs: [],
  outputs: [{ id: "repo", type: "repo" }],
  params: {
    type: "object",
    properties: {
      url: { type: "string" },
      branch: { type: "string", default: "main" },
    },
    required: ["url"],
  },
  impl: { kind: "resource", resource: "repo" },
};

const serviceManifest: NodeManifest = {
  id: "core.deploy.service",
  version: "0.1.0",
  name: "Servicio",
  category: "Hosteo",
  inputs: [{ id: "repo", type: "repo" }],
  outputs: [{ id: "service", type: "service" }],
  params: {
    type: "object",
    properties: {
      build: { enum: ["docker", "native", "static"], default: "native" },
      startCommand: { type: "string" },
    },
    required: ["build"],
  },
  impl: { kind: "resource", resource: "service" },
};

const catalogWithResources = [...coreCatalog, repoManifest, serviceManifest];

const repoToService = {
  id: "r-svc-repo",
  from: { node: "r", port: "repo" },
  to: { node: "svc", port: "repo" },
};

const resourceNodes = () => [
  flowNode("r", "core.deploy.repo", { url: "https://github.com/acme/web" }),
  flowNode("svc", "core.deploy.service", { build: "native", startCommand: "npm start" }),
];

const deployFlow = () => flowOf(resourceNodes(), [repoToService]);

const dataNodes = () => [
  flowNode("s", "core.source", { sourceId: "src_1" }),
  flowNode("f", "core.filter", { column: "x", value: "1" }),
];

const dataFlow = () => flowOf(dataNodes(), [edge("s", "f")]);

const mixedFlow = () =>
  flowOf([...dataNodes(), ...resourceNodes()], [edge("s", "f"), repoToService]);

const harnessWithResources = () =>
  createHarness({
    catalog: catalogWithResources,
    presetSources: { src_1: { format: "csv", location: { kind: "url", url: "https://x/v.csv" } } },
  });

/** A coordinator with no executor at all, recording the node states it reports. */
const coordinatorWithoutExecutors = () => {
  const emitted: Array<{ readonly event: NepEvent; readonly payload: unknown }> = [];
  const finishWaiters: Array<() => void> = [];
  const ids = { next: 0 };
  const coordinator = createCoordinator({
    executors: [],
    catalog: catalogWithResources,
    emit: (event, payload) => {
      emitted.push({ event, payload });
      if (event === "run.finished")
        finishWaiters.forEach((resolve) => {
          resolve();
        });
    },
    now: () => (ids.next += 1),
    createId: (prefix) => `${prefix}-${String((ids.next += 1))}`,
  });
  const events = <E extends NepEvent>(event: E): Array<NepEventPayload<E>> =>
    emitted
      .filter((entry) => entry.event === event)
      .map((entry) => {
        const parsed = parse(NepNotifications[event], entry.payload);
        if (!parsed.ok) throw new Error(`Emitted ${event} breaks the protocol`);
        return parsed.value;
      });
  const setAndRun = async (flow: Flow) => {
    await coordinator["flow.set"]({ rev: 1, flow });
    const done = new Promise<void>((resolve) => finishWaiters.push(resolve));
    await coordinator["flow.run"]({ rev: 1 });
    await done;
  };
  return { events, setAndRun };
};

const repoWithoutUrlFlow = () => flowOf([flowNode("r", "core.deploy.repo", {})], []);

const unconnectedServiceFlow = () =>
  flowOf(
    [flowNode("svc", "core.deploy.service", { build: "native", startCommand: "npm start" })],
    [],
  );

const lastStatusOf = (harness: ReturnType<typeof createHarness>, runId: string, nodeId: string) =>
  harness
    .events("node.status")
    .filter((status) => status.runId === runId && status.nodeId === nodeId)
    .at(-1);

const resultsOf = (harness: ReturnType<typeof createHarness>) =>
  harness
    .events("node.result")
    .map((result) => ({ nodeId: result.nodeId, port: result.port, rows: result.ref.rowCount }));

describe("createCoordinator: resource nodes", () => {
  it("reports no errors for a well-configured repo and service", async () => {
    const harness = harnessWithResources();

    const answer = await harness.coordinator["flow.set"]({ rev: 1, flow: deployFlow() });

    expect(answer.errors).toEqual([]);
  });

  it("finishes the repo and the service as done", async () => {
    const harness = harnessWithResources();

    const runId = await harness.setAndRun(deployFlow(), 1);

    expect(harness.statesOf(runId, "r").at(-1)).toBe("done");
    expect(harness.statesOf(runId, "svc").at(-1)).toBe("done");
    expect(harness.events("run.finished")[0]).toMatchObject({ runId, status: "done" });
  });

  it("emits no result for resource nodes", async () => {
    const harness = harnessWithResources();

    await harness.setAndRun(deployFlow(), 1);

    expect(harness.events("node.result")).toEqual([]);
  });

  it("never sends a resource node to an executor", async () => {
    const harness = harnessWithResources();

    await harness.setAndRun(deployFlow(), 1);

    expect(harness.sql.tasks).toEqual([]);
    expect(harness.python.tasks).toEqual([]);
    expect(harness.sql.calls.filter((call) => call.method === "exec.run")).toEqual([]);
    expect(harness.python.calls.filter((call) => call.method === "exec.run")).toEqual([]);
  });

  it("never reports a resource node as an error", async () => {
    const harness = harnessWithResources();

    const runId = await harness.setAndRun(deployFlow(), 1);

    expect([...harness.statesOf(runId, "r"), ...harness.statesOf(runId, "svc")]).not.toContain(
      "error",
    );
  });

  it("runs the data nodes of a mixed flow exactly as without the resource nodes", async () => {
    const dataOnly = harnessWithResources();
    const mixed = harnessWithResources();
    await dataOnly.setAndRun(dataFlow(), 1);

    const runId = await mixed.setAndRun(mixedFlow(), 1);

    expect(mixed.sql.tasks).toEqual(dataOnly.sql.tasks);
    expect(resultsOf(mixed)).toEqual(resultsOf(dataOnly));
    expect(mixed.statesOf(runId, "f")).toEqual(["queued", "running", "done"]);
    expect(mixed.events("run.finished")[0]).toMatchObject({ status: "done" });
  });

  it("does not need an executor for resource nodes", async () => {
    const engine = coordinatorWithoutExecutors();

    await engine.setAndRun(deployFlow());

    expect(engine.events("node.status").filter((status) => status.error !== undefined)).toEqual([]);
    expect(engine.events("run.finished")).toMatchObject([{ status: "done" }]);
  });

  it("never reports RUNTIME_UNAVAILABLE for a resource node", async () => {
    const engine = coordinatorWithoutExecutors();

    await engine.setAndRun(deployFlow());

    expect(engine.events("node.status").map((status) => status.error?.code)).not.toContain(
      "RUNTIME_UNAVAILABLE",
    );
    expect(
      engine
        .events("node.status")
        .filter((status) => status.nodeId === "svc")
        .map((status) => status.state),
    ).toContain("done");
  });
});

describe("createCoordinator: misconfigured resource nodes", () => {
  it("ends a repo without its required url in error", async () => {
    const harness = harnessWithResources();

    const runId = await harness.setAndRun(repoWithoutUrlFlow(), 1);

    expect(harness.statesOf(runId, "r").at(-1)).toBe("error");
  });

  it("reports the missing url config issue as the repo error", async () => {
    const harness = harnessWithResources();
    const { errors } = await harness.coordinator["flow.set"]({
      rev: 1,
      flow: repoWithoutUrlFlow(),
    });
    const issue = errors.find((candidate) => candidate.nodeId === "r");

    const runId = await harness.run(1);

    expect(issue).toMatchObject({ code: "PARAM_REQUIRED", param: "url" });
    expect(lastStatusOf(harness, runId, "r")?.error).toMatchObject({
      code: issue?.code,
      message: issue?.message,
    });
  });

  it("finishes the run as error when a repo is misconfigured", async () => {
    const harness = harnessWithResources();

    const runId = await harness.setAndRun(repoWithoutUrlFlow(), 1);

    expect(harness.events("run.finished")).toMatchObject([{ runId, status: "error" }]);
  });

  it("ends a service without its repo input connected in error with INPUT_MISSING", async () => {
    const harness = harnessWithResources();

    const runId = await harness.setAndRun(unconnectedServiceFlow(), 1);

    expect(lastStatusOf(harness, runId, "svc")).toMatchObject({
      state: "error",
      error: { code: "INPUT_MISSING" },
    });
  });

  it("finishes the run as error when a service has no repo connected", async () => {
    const harness = harnessWithResources();

    const runId = await harness.setAndRun(unconnectedServiceFlow(), 1);

    expect(harness.events("run.finished")).toMatchObject([{ runId, status: "error" }]);
  });

  it("still never sends a misconfigured resource node to an executor", async () => {
    const harness = harnessWithResources();

    await harness.setAndRun(repoWithoutUrlFlow(), 1);

    expect(harness.sql.tasks).toEqual([]);
    expect(harness.python.tasks).toEqual([]);
  });

  it("reports a misconfigured resource node as error even without executors", async () => {
    const engine = coordinatorWithoutExecutors();

    await engine.setAndRun(repoWithoutUrlFlow());

    expect(
      engine
        .events("node.status")
        .filter((status) => status.nodeId === "r")
        .at(-1),
    ).toMatchObject({ state: "error", error: { code: "PARAM_REQUIRED" } });
    expect(engine.events("run.finished")).toMatchObject([{ status: "error" }]);
  });
});
