import type { NodeManifest } from "@nodomics/protocol";
import { describe, expect, it } from "vitest";
import { coreNodes } from "./index.ts";

const HOSTING_CATEGORY = "Hosteo";

const manifestOf = (id: string): NodeManifest => {
  const manifest = coreNodes.find((node) => node.id === id);
  if (manifest === undefined) throw new Error(`The catalog has no ${id}`);
  return manifest;
};

const paramOf = (manifest: NodeManifest, param: string) => manifest.params.properties[param];

const constantsOf = (schema: unknown): unknown[] => {
  const options =
    typeof schema === "object" && schema !== null && "oneOf" in schema ? schema.oneOf : [];
  return Array.isArray(options)
    ? options.map((option: unknown) =>
        typeof option === "object" && option !== null && "const" in option
          ? option.const
          : undefined,
      )
    : [];
};

describe("core.deploy.repo", () => {
  it("is a repo resource in the hosting category", () => {
    const repo = manifestOf("core.deploy.repo");

    expect(repo).toMatchObject({
      category: HOSTING_CATEGORY,
      icon: "git-branch",
      impl: { kind: "resource", resource: "repo" },
    });
  });

  it("has no inputs and a single repo output", () => {
    const repo = manifestOf("core.deploy.repo");

    expect(repo.inputs).toEqual([]);
    expect(repo.outputs).toEqual([{ id: "repo", type: "repo" }]);
  });

  it("requires only the repository url", () => {
    expect(manifestOf("core.deploy.repo").params.required).toEqual(["url"]);
  });

  it("asks for the repository url as text", () => {
    expect(paramOf(manifestOf("core.deploy.repo"), "url")).toMatchObject({
      type: "string",
      title: "Repositorio",
    });
  });

  it("uses the main branch by default", () => {
    expect(paramOf(manifestOf("core.deploy.repo"), "branch")).toMatchObject({
      type: "string",
      title: "Rama",
      default: "main",
    });
  });

  it("offers an optional project folder without a default", () => {
    const rootDir = paramOf(manifestOf("core.deploy.repo"), "rootDir");

    expect(rootDir).toMatchObject({ type: "string", title: "Carpeta" });
    expect(rootDir).not.toHaveProperty("default");
  });

  it("has exactly the repo params of the contract", () => {
    expect(Object.keys(manifestOf("core.deploy.repo").params.properties).sort()).toEqual([
      "branch",
      "rootDir",
      "url",
    ]);
  });
});

describe("core.deploy.service", () => {
  it("is a service resource in the hosting category", () => {
    const service = manifestOf("core.deploy.service");

    expect(service).toMatchObject({
      category: HOSTING_CATEGORY,
      icon: "server",
      impl: { kind: "resource", resource: "service" },
    });
  });

  it("reads a repo and offers a service", () => {
    const service = manifestOf("core.deploy.service");

    expect(service.inputs).toEqual([{ id: "repo", type: "repo" }]);
    expect(service.outputs).toEqual([{ id: "service", type: "service" }]);
  });

  it("requires only how it is built", () => {
    expect(manifestOf("core.deploy.service").params.required).toEqual(["build"]);
  });

  it("builds natively by default, choosing between docker, native and static", () => {
    const build = paramOf(manifestOf("core.deploy.service"), "build");

    expect(build).toMatchObject({
      title: "Cómo se construye",
      default: "native",
      oneOf: [
        { const: "docker", title: "Docker" },
        { const: "native", title: "Nativo" },
        { const: "static", title: "Estático" },
      ],
    });
  });

  it("offers the native runtimes with node by default", () => {
    const runtime = paramOf(manifestOf("core.deploy.service"), "runtime");

    expect(runtime).toMatchObject({ title: "Runtime", default: "node" });
    expect(constantsOf(runtime)).toEqual(["node", "python", "go", "ruby", "rust", "elixir"]);
  });

  it.each([
    ["buildCommand", "Comando de build"],
    ["startCommand", "Comando de inicio"],
    ["healthCheckPath", "Ruta de salud"],
  ])("offers %s as optional text without a default", (param, title) => {
    const schema = paramOf(manifestOf("core.deploy.service"), param);

    expect(schema).toMatchObject({ type: "string", title });
    expect(schema).not.toHaveProperty("default");
  });

  it.each([
    ["publishPath", "Carpeta publicada", "dist"],
    ["dockerfilePath", "Dockerfile", "Dockerfile"],
    ["dockerContext", "Contexto", "."],
  ])("offers %s as text with its default", (param, title, defaultValue) => {
    expect(paramOf(manifestOf("core.deploy.service"), param)).toMatchObject({
      type: "string",
      title,
      default: defaultValue,
    });
  });

  it("takes environment variables as key-values that may name a secret", () => {
    expect(paramOf(manifestOf("core.deploy.service"), "env")).toMatchObject({
      type: "array",
      title: "Variables de entorno",
      default: [],
      "x-nodomics": { widget: "key-values" },
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          value: { type: "string" },
          secret: { type: "string" },
        },
        required: ["name"],
      },
    });
  });

  it("has exactly the service params of the contract", () => {
    expect(Object.keys(manifestOf("core.deploy.service").params.properties).sort()).toEqual([
      "build",
      "buildCommand",
      "dockerContext",
      "dockerfilePath",
      "env",
      "healthCheckPath",
      "publishPath",
      "runtime",
      "startCommand",
    ]);
  });
});
