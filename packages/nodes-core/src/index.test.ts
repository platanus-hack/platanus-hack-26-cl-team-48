import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { coreNodes, sampleDatasets } from "./index.ts";
import { findUnsafeInterpolations } from "./template-safety.ts";

const CORE_NODE_IDS = [
  "core.cast",
  "core.deploy.repo",
  "core.deploy.service",
  "core.filter",
  "core.formula",
  "core.group",
  "core.join",
  "core.limit",
  "core.python.custom",
  "core.python.zscore",
  "core.select",
  "core.sort",
  "core.source.api",
  "core.source.csv",
  "core.source.sample",
  "core.sql",
  "core.view.bar",
  "core.view.line",
  "core.view.table",
  "flow.input",
  "flow.node",
  "flow.output",
];

const nodeById = (id: string) => coreNodes.find((manifest) => manifest.id === id);

describe("coreNodes", () => {
  it("names an icon for every node the library shows", () => {
    expect(
      coreNodes
        .filter((manifest) => !manifest.id.startsWith("flow."))
        .filter((manifest) => manifest.icon === undefined),
    ).toEqual([]);
  });

  it("lists the official nodes sorted by id", () => {
    expect(coreNodes.map((manifest) => manifest.id)).toEqual(CORE_NODE_IDS);
  });

  it("escapes every free param in the SQL templates, except the free SQL node's query", () => {
    const unsafe = coreNodes
      .map((manifest) => ({ id: manifest.id, unsafe: findUnsafeInterpolations(manifest) }))
      .filter((entry) => entry.unsafe.length > 0);

    expect(unsafe).toEqual([{ id: "core.sql", unsafe: ["{{query}}"] }]);
  });

  it("embeds the Python code of Python nodes", () => {
    const zscore = nodeById("core.python.zscore");

    expect(zscore?.impl).toMatchObject({ kind: "python", entry: "run" });
    expect(zscore?.impl.kind === "python" && zscore.impl.code).toContain("def run(");
  });

  it("reads a CSV source through the source helper", () => {
    expect(nodeById("core.source.csv")?.impl).toEqual({
      kind: "sql",
      template: "SELECT * FROM {{source sourceId}}",
    });
  });

  it("exposes the input of the free SQL node as the entrada CTE", () => {
    expect(nodeById("core.sql")?.impl).toEqual({
      kind: "sql",
      template: "WITH entrada AS (SELECT * FROM {{in}}) {{query}}",
    });
  });

  it("marks the free Python code param with the code widget", () => {
    expect(nodeById("core.python.custom")?.params.properties["code"]).toMatchObject({
      "x-nodomics": { widget: "code" },
    });
  });
});

describe("sampleDatasets", () => {
  it("points the ventas sample to the bundled CSV file", () => {
    const ventas = sampleDatasets["sample.ventas"];

    expect(ventas?.format).toBe("csv");
    expect(ventas !== undefined && existsSync(new URL(ventas.url))).toBe(true);
  });
});
