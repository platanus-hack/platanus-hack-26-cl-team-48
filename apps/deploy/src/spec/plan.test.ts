import { describe, expect, it } from "vitest";
import type { ServiceSpec } from "../types.ts";
import { hashSpec, planDeployment } from "./plan.ts";

const SPEC: ServiceSpec = {
  repo: { url: "https://github.com/nodomics/demo-app", branch: "main" },
  build: { kind: "native", runtime: "node", buildCommand: "npm ci", startCommand: "npm start" },
  env: [{ name: "NODE_ENV", value: "production" }],
};

const previousOf = (spec: ServiceSpec) => ({ spec, specHash: hashSpec(spec) });

describe("hashSpec", () => {
  it("returns a non-empty string", () => {
    const hash = hashSpec(SPEC);

    expect(typeof hash).toBe("string");
    expect(hash).not.toBe("");
  });

  it("returns the same hash for the same content", () => {
    const copy: ServiceSpec = structuredClone(SPEC);

    const hashes = [hashSpec(SPEC), hashSpec(copy)];

    expect(hashes[0]).toBe(hashes[1]);
  });

  it("does not depend on the order of the keys", () => {
    const reordered: ServiceSpec = {
      env: [{ value: "production", name: "NODE_ENV" }],
      build: { startCommand: "npm start", buildCommand: "npm ci", runtime: "node", kind: "native" },
      repo: { branch: "main", url: "https://github.com/nodomics/demo-app" },
    };

    const hash = hashSpec(reordered);

    expect(hash).toBe(hashSpec(SPEC));
  });

  it.each<[string, ServiceSpec]>([
    ["the branch", { ...SPEC, repo: { ...SPEC.repo, branch: "dev" } }],
    ["the root folder", { ...SPEC, repo: { ...SPEC.repo, rootDir: "api" } }],
    [
      "the start command",
      {
        ...SPEC,
        build: {
          kind: "native",
          runtime: "node",
          buildCommand: "npm ci",
          startCommand: "node server.js",
        },
      },
    ],
    ["a variable value", { ...SPEC, env: [{ name: "NODE_ENV", value: "development" }] }],
    ["a variable secret name", { ...SPEC, env: [{ name: "NODE_ENV", secret: "env-secret" }] }],
    ["the health check path", { ...SPEC, healthCheckPath: "/health" }],
  ])("changes when %s changes", (_field, changed) => {
    const hash = hashSpec(changed);

    expect(hash).not.toBe(hashSpec(SPEC));
  });
});

describe("planDeployment", () => {
  it("plans a create when there is no previous deployment", () => {
    const plan = planDeployment(SPEC, undefined);

    expect(plan.action).toBe("create");
  });

  it("lists every top-level field present in a create without a before value", () => {
    const spec: ServiceSpec = { ...SPEC, healthCheckPath: "/health" };

    const plan = planDeployment(spec, undefined);

    expect([...plan.changes].sort((a, b) => a.field.localeCompare(b.field))).toEqual([
      { field: "build", after: spec.build },
      { field: "env", after: spec.env },
      { field: "healthCheckPath", after: "/health" },
      { field: "repo", after: spec.repo },
    ]);
    expect(
      plan.changes.every((change) => !("before" in change) || change.before === undefined),
    ).toBe(true);
  });

  it("does not list an absent health check path in a create", () => {
    const plan = planDeployment(SPEC, undefined);

    expect(plan.changes.map((change) => change.field)).not.toContain("healthCheckPath");
  });

  it("plans unchanged with no changes when the previous hash matches", () => {
    const plan = planDeployment(SPEC, previousOf(structuredClone(SPEC)));

    expect(plan.action).toBe("unchanged");
    expect(plan.changes).toEqual([]);
  });

  it("plans an update listing only the field that differs", () => {
    const changed: ServiceSpec = { ...SPEC, repo: { ...SPEC.repo, branch: "release" } };

    const plan = planDeployment(changed, previousOf(SPEC));

    expect(plan.action).toBe("update");
    expect(plan.changes).toEqual([{ field: "repo", before: SPEC.repo, after: changed.repo }]);
  });

  it("lists one change per differing top-level field in an update", () => {
    const changed: ServiceSpec = {
      ...SPEC,
      build: { kind: "static", publishPath: "dist" },
      env: [],
    };

    const plan = planDeployment(changed, previousOf(SPEC));

    expect([...plan.changes].sort((a, b) => a.field.localeCompare(b.field))).toEqual([
      { field: "build", before: SPEC.build, after: changed.build },
      { field: "env", before: SPEC.env, after: [] },
    ]);
  });

  it("lists an added health check path with no before value", () => {
    const changed: ServiceSpec = { ...SPEC, healthCheckPath: "/health" };

    const plan = planDeployment(changed, previousOf(SPEC));

    expect(plan.changes).toHaveLength(1);
    expect(plan.changes[0]?.field).toBe("healthCheckPath");
    expect(plan.changes[0]?.before).toBeUndefined();
    expect(plan.changes[0]?.after).toBe("/health");
  });

  it("lists a removed health check path with no after value", () => {
    const previous: ServiceSpec = { ...SPEC, healthCheckPath: "/health" };

    const plan = planDeployment(SPEC, previousOf(previous));

    expect(plan.changes).toHaveLength(1);
    expect(plan.changes[0]?.field).toBe("healthCheckPath");
    expect(plan.changes[0]?.before).toBe("/health");
    expect(plan.changes[0]?.after).toBeUndefined();
  });

  it("uses the hash of the new spec as the plan hash", () => {
    const changed: ServiceSpec = { ...SPEC, env: [] };

    const plan = planDeployment(changed, previousOf(SPEC));

    expect(plan.hash).toBe(hashSpec(changed));
  });

  it("carries the spec it planned", () => {
    const plan = planDeployment(SPEC, undefined);

    expect(plan.spec).toEqual(SPEC);
  });
});
