import { NepErrorCode } from "@nodomics/protocol";
import { JsonRpcErrorCode } from "@nodomics/rpc";
import { describe, expect, it } from "vitest";
import { connectTestClient, type TestClient } from "./testing/connect-test-client.ts";
import { edgeOf, flowOf, nodeOf, resultRefOf, sourceNode } from "./testing/flow-fixtures.ts";

const REGION = 1;
const UNIDADES = 3;
const PRECIO = 4;

const barNode = nodeOf("bar", "core.view.bar", { x: "region", y: "unidades" });

const sourceToBar = flowOf([sourceNode("src"), barNode], [edgeOf("src", "bar")]);

const runSource = async (client: TestClient) => {
  await client.request("flow.set", { rev: 1, flow: sourceToBar });
  const finished = new Promise((resolve) => client.peer.on("run.finished", resolve));
  await client.request("flow.run", { rev: 1 });
  await finished;
  return resultRefOf(client.events, "src")?.id ?? "";
};

const allRowsOf = async (client: TestClient, ref: string) =>
  (await client.request("data.page", { ref, offset: 0, limit: 1000 })).rows;

const numbersIn = (rows: unknown[][], index: number) =>
  rows.map((row) => row[index]).filter((cell): cell is number => typeof cell === "number");

describe("data.page", () => {
  it("returns the requested window of rows with the total", async () => {
    const client = connectTestClient();
    const ref = await runSource(client);
    const all = await allRowsOf(client, ref);

    const page = await client.request("data.page", { ref, offset: 10, limit: 5 });

    expect(page.rows).toEqual(all.slice(10, 15));
    expect(page.total).toBe(50);
  });

  it("sorts the rows before paging", async () => {
    const client = connectTestClient();
    const ref = await runSource(client);

    const page = await client.request("data.page", {
      ref,
      offset: 0,
      limit: 1000,
      sort: { column: "unidades", direction: "desc" },
    });

    const unidades = numbersIn(page.rows, UNIDADES);
    expect(unidades).toEqual([...unidades].sort((a, b) => b - a));
  });

  it("rejects sorting by a column the result does not have", async () => {
    const client = connectTestClient();
    const ref = await runSource(client);

    const page = client.request("data.page", {
      ref,
      offset: 0,
      limit: 10,
      sort: { column: "nope", direction: "asc" },
    });

    await expect(page).rejects.toMatchObject({ code: JsonRpcErrorCode.INVALID_PARAMS });
  });

  it("answers RESULT_EXPIRED for an unknown reference", async () => {
    const client = connectTestClient();

    const page = client.request("data.page", { ref: "r_gone", offset: 0, limit: 10 });

    await expect(page).rejects.toMatchObject({ code: NepErrorCode.RESULT_EXPIRED });
  });
});

describe("data.profile", () => {
  it("counts nulls and distinct values from the real rows", async () => {
    const client = connectTestClient();
    const ref = await runSource(client);
    const all = await allRowsOf(client, ref);

    const { columns } = await client.request("data.profile", { ref });

    expect(columns.find((column) => column.name === "precio")).toMatchObject({
      count: 50,
      nulls: all.filter((row) => row[PRECIO] === null).length,
    });
    expect(columns.find((column) => column.name === "region")?.distinct).toBe(
      new Set(all.map((row) => row[REGION])).size,
    );
  });

  it("reports the real minimum and maximum", async () => {
    const client = connectTestClient();
    const ref = await runSource(client);
    const unidades = numbersIn(await allRowsOf(client, ref), UNIDADES);

    const { columns } = await client.request("data.profile", { ref });

    expect(columns.find((column) => column.name === "unidades")).toMatchObject({
      min: String(Math.min(...unidades)),
      max: String(Math.max(...unidades)),
    });
  });

  it("answers RESULT_EXPIRED for an unknown reference", async () => {
    const client = connectTestClient();

    await expect(client.request("data.profile", { ref: "r_gone" })).rejects.toMatchObject({
      code: NepErrorCode.RESULT_EXPIRED,
    });
  });
});

describe("schema.infer", () => {
  it("returns the ventas columns for a table port", async () => {
    const client = connectTestClient();
    await client.request("flow.set", { rev: 1, flow: sourceToBar });

    const inferred = await client.request("schema.infer", { nodeId: "bar", port: "in" });

    expect(inferred).toEqual({
      ok: true,
      columns: [
        { name: "fecha", type: "date" },
        { name: "region", type: "text" },
        { name: "producto", type: "text" },
        { name: "unidades", type: "number" },
        { name: "precio", type: "number" },
      ],
    });
  });

  it("answers TYPE_MISMATCH as a node error for a port that is not a table", async () => {
    const client = connectTestClient();
    await client.request("flow.set", {
      rev: 1,
      flow: flowOf([nodeOf("in1", "flow.input")]),
    });

    const inferred = await client.request("schema.infer", { nodeId: "in1", port: "out" });

    expect(inferred).toMatchObject({ ok: false, error: { code: "TYPE_MISMATCH" } });
  });

  it("answers UNKNOWN_NODE for a node outside the current flow", async () => {
    const client = connectTestClient();

    await expect(
      client.request("schema.infer", { nodeId: "ghost", port: "in" }),
    ).rejects.toMatchObject({ code: NepErrorCode.UNKNOWN_NODE });
  });
});

describe("data.view", () => {
  it("returns a bar chart spec with the input aggregated by category", async () => {
    const client = connectTestClient();
    const all = await allRowsOf(client, await runSource(client));

    const view = await client.request("data.view", { nodeId: "bar" });

    const norte = all
      .filter((row) => row[REGION] === "Norte")
      .reduce((sum, row) => sum + Number(row[UNIDADES]), 0);
    expect(view).toMatchObject({ rowCount: 4, sampled: false, spec: { mark: "bar" } });
    expect(view.spec).toHaveProperty(
      "data.values",
      expect.arrayContaining([{ region: "Norte", unidades: norte }]),
    );
  });

  it("answers UNKNOWN_NODE for a node outside the current flow", async () => {
    const client = connectTestClient();

    await expect(client.request("data.view", { nodeId: "ghost" })).rejects.toMatchObject({
      code: NepErrorCode.UNKNOWN_NODE,
    });
  });
});

describe("figures and completion", () => {
  it("holds no figures, since its nodes draw none", async () => {
    const client = connectTestClient();

    await expect(client.request("data.display", { ref: "d_1" })).rejects.toMatchObject({
      code: NepErrorCode.RESULT_EXPIRED,
    });
  });

  it("completes no code, as it does not announce code completion", async () => {
    const client = connectTestClient();
    await client.request("flow.set", { rev: 1, flow: sourceToBar });

    await expect(
      client.request("code.complete", { nodeId: "bar", code: "", line: 1, column: 0 }),
    ).resolves.toEqual({ items: [] });
  });
});
