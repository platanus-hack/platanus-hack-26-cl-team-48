import { JsonRpcErrorCode } from "@nodomics/rpc";
import { describe, expect, it } from "vitest";
import { createHarness } from "./testing/coordinator-harness.ts";
import { filterManifest, flowNode, flowOf } from "./testing/catalog-fixtures.ts";

describe("createCoordinator: catalog", () => {
  it("lists the catalog it was given", async () => {
    const { coordinator } = createHarness({ catalog: [filterManifest] });

    await expect(coordinator["nodes.list"]({})).resolves.toEqual({ nodes: [filterManifest] });
  });

  it("adds registered nodes to the catalog", async () => {
    const { coordinator } = createHarness({ catalog: [] });
    const custom = { ...filterManifest, id: "custom.filter" };

    await coordinator["nodes.register"]({ nodes: [custom] });

    await expect(coordinator["nodes.list"]({})).resolves.toEqual({ nodes: [custom] });
  });
});

describe("createCoordinator: source.add", () => {
  it("loads an uploaded file into the SQL executor with the format of its name", async () => {
    const { coordinator, sql } = createHarness();
    const bytes = Uint8Array.from([1, 2, 3]);

    const added = await coordinator["source.add"]({
      kind: "upload",
      name: "ventas.csv",
      file: bytes,
    });

    expect(added).toEqual({ sourceId: "source-1", name: "ventas.csv" });
    expect(sql.calls).toContainEqual({
      method: "exec.load",
      params: { sourceId: "source-1", format: "csv", location: { kind: "bytes", bytes } },
    });
  });

  it("names a URL source after the last segment of its URL", async () => {
    const { coordinator, sql } = createHarness();

    const added = await coordinator["source.add"]({
      kind: "url",
      url: "https://x.org/d/v.parquet?a=1",
    });

    expect(added.name).toBe("v.parquet");
    expect(sql.calls.at(-1)?.params).toMatchObject({
      format: "parquet",
      location: { kind: "url", url: "https://x.org/d/v.parquet?a=1" },
    });
  });

  it("rejects a file whose format it does not know", async () => {
    const { coordinator } = createHarness();

    await expect(
      coordinator["source.add"]({ kind: "path", path: "/datos/v.xlsx" }),
    ).rejects.toMatchObject({ code: JsonRpcErrorCode.INVALID_PARAMS });
  });

  it("lets a SQL node read an added source through {{source}}", async () => {
    const harness = createHarness();
    const { sourceId } = await harness.coordinator["source.add"]({
      kind: "upload",
      name: "v.csv",
      file: Uint8Array.from([1]),
    });

    const runId = await harness.setAndRun(
      flowOf([flowNode("s", "core.source", { sourceId })], []),
      1,
    );

    expect(harness.statesOf(runId, "s")).toEqual(["queued", "running", "done"]);
  });

  it("loads a preset source the first time a template reads it, and only once", async () => {
    const harness = createHarness({
      presetSources: {
        "sample.ventas": { format: "csv", location: { kind: "url", url: "https://x/ventas.csv" } },
      },
    });
    const flow = flowOf(
      [
        flowNode("d", "core.source.sample"),
        flowNode("e", "core.source", { sourceId: "sample.ventas" }),
      ],
      [],
    );

    await harness.setAndRun(flow, 1);

    expect(harness.sql.calls.filter((call) => call.method === "exec.load")).toEqual([
      {
        method: "exec.load",
        params: {
          sourceId: "sample.ventas",
          format: "csv",
          location: { kind: "url", url: "https://x/ventas.csv" },
        },
      },
    ]);
  });

  it("fails a node that reads a source the engine does not have", async () => {
    const harness = createHarness();

    const runId = await harness.setAndRun(
      flowOf([flowNode("s", "core.source", { sourceId: "nope" })], []),
      1,
    );

    expect(harness.events("node.status").at(-1)).toMatchObject({
      runId,
      nodeId: "s",
      state: "error",
      error: { code: "SOURCE_UNREADABLE" },
    });
  });
});

it("preserves the complete unreadable source error as RPC data", async () => {
  const error = {
    code: "SOURCE_UNREADABLE" as const,
    message: "CSV inválido",
    hint: "Revisa el CSV",
    detail: "line 2",
  };
  const { coordinator } = createHarness({ loadError: error });

  await expect(coordinator["source.add"]({ kind: "path", path: "/bad.csv" })).rejects.toMatchObject(
    { code: -32603, message: error.message, data: error },
  );
});
