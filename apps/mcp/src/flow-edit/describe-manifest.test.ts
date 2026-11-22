import { coreNodes } from "@nodomics/nodes-core";
import { describe, expect, it } from "vitest";
import { describeManifest } from "./index.ts";
import { joinManifest, sourceManifest, transformManifest } from "./test-fixtures.ts";

describe("describeManifest", () => {
  it("uses the manifest id as type and its name as title", () => {
    const summary = describeManifest(sourceManifest);

    expect(summary.type).toBe("t.source");
    expect(summary.title).toBe("Source");
  });

  it("lists the ids of the input and output ports", () => {
    const summary = describeManifest(joinManifest);

    expect(summary.inputs).toEqual(["left", "right"]);
    expect(summary.outputs).toEqual(["out"]);
  });

  it("describes a param with its title, unit and schema", () => {
    const summary = describeManifest(sourceManifest);

    expect(summary.params.find((p) => p.name === "rows")).toEqual({
      name: "rows",
      title: "Filas",
      unit: "filas",
      schema: sourceManifest.params.properties["rows"],
    });
  });

  it("falls back to the param name as title and to null as unit", () => {
    const summary = describeManifest(sourceManifest);

    expect(summary.params.find((p) => p.name === "label")).toEqual({
      name: "label",
      title: "label",
      unit: null,
      schema: { type: "string" },
    });
  });

  it("lists every param of the manifest", () => {
    const summary = describeManifest(transformManifest);

    expect(summary.params.map((p) => p.name)).toEqual(
      Object.keys(transformManifest.params.properties),
    );
  });

  it("describes a core node", () => {
    const limit = coreNodes.find((m) => m.id === "core.limit");
    if (!limit) throw new Error("core.limit is missing from the catalog");

    const summary = describeManifest(limit);

    expect(summary).toMatchObject({
      type: "core.limit",
      inputs: ["in"],
      outputs: ["out"],
      params: [{ name: "n", title: "Filas", unit: null }],
    });
  });
});
