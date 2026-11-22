import { describe, expect, it } from "vitest";
import { exportJsonSchemas } from "./json-schema.ts";
import { NodeManifest, ResourceImpl } from "./manifest.ts";
import { parse } from "./parse.ts";
import { DataType } from "./primitives.ts";

const repoManifest = {
  id: "core.deploy.repo",
  version: "0.1.0",
  name: "Repositorio",
  category: "Hosteo",
  inputs: [],
  outputs: [{ id: "repo", type: "repo" }],
  params: {
    type: "object",
    properties: { url: { type: "string", title: "Repositorio" } },
    required: ["url"],
  },
  impl: { kind: "resource", resource: "repo" },
};

const serviceManifest = {
  ...repoManifest,
  id: "core.deploy.service",
  name: "Servicio",
  inputs: [{ id: "repo", type: "repo" }],
  outputs: [{ id: "service", type: "service" }],
  params: { type: "object", properties: {} },
  impl: { kind: "resource", resource: "service" },
};

describe("NodeManifest with a resource implementation", () => {
  it("accepts a repo resource node", () => {
    expect(parse(NodeManifest, repoManifest).ok).toBe(true);
  });

  it("accepts a service resource node", () => {
    expect(parse(NodeManifest, serviceManifest).ok).toBe(true);
  });

  it("rejects an unknown resource", () => {
    const database = { ...repoManifest, impl: { kind: "resource", resource: "database" } };

    expect(parse(NodeManifest, database).ok).toBe(false);
  });

  it("rejects a resource implementation without its resource", () => {
    expect(parse(NodeManifest, { ...repoManifest, impl: { kind: "resource" } }).ok).toBe(false);
  });
});

describe("ResourceImpl", () => {
  it.each(["repo", "service"])("parses the %s resource", (resource) => {
    expect(parse(ResourceImpl, { kind: "resource", resource })).toEqual({
      ok: true,
      value: { kind: "resource", resource },
    });
  });

  it("rejects an implementation of another kind", () => {
    expect(parse(ResourceImpl, { kind: "sql", template: "SELECT 1" }).ok).toBe(false);
  });
});

describe("DataType for hosting", () => {
  it.each(["repo", "service"])("accepts the %s port type", (type) => {
    expect(parse(DataType, type).ok).toBe(true);
  });

  it("accepts repo and service ports on a manifest", () => {
    const ports = {
      ...repoManifest,
      inputs: [{ id: "repo", type: "repo" }],
      outputs: [{ id: "service", type: "service" }],
    };

    expect(parse(NodeManifest, ports).ok).toBe(true);
  });
});

describe("exportJsonSchemas", () => {
  it("describes the resource implementation in the manifest schema", () => {
    const manifestSchema = JSON.stringify(exportJsonSchemas().manifest);

    expect(manifestSchema).toContain('"const":"resource"');
    expect(manifestSchema).toContain('"const":"service"');
  });
});
