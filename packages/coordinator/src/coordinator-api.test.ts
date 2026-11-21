import type { NodeManifest } from "@nodomics/protocol";
import { describe, expect, it } from "vitest";
import { coreCatalog, flowNode, flowOf } from "./testing/catalog-fixtures.ts";
import { createHarness } from "./testing/coordinator-harness.ts";

const apiManifest: NodeManifest = {
  id: "core.source.api",
  version: "0.1.0",
  name: "API",
  category: "Fuentes",
  inputs: [],
  outputs: [{ id: "out", type: "table" }],
  params: {
    type: "object",
    properties: {
      url: { type: "string" },
      query: { type: "array" },
      headers: { type: "array" },
      format: { enum: ["json", "csv"], default: "json" },
      records: { type: "string" },
    },
    required: ["url"],
  },
  impl: {
    kind: "sql",
    template:
      "SELECT * FROM {{request url query=query headers=headers format=format records=records}}",
  },
};

type Call = { readonly url: string; readonly headers: Readonly<Record<string, string>> };

function fakeFetch(respond: () => Promise<Response>) {
  const calls: Call[] = [];
  const fetch = (url: string, init: { readonly headers: Readonly<Record<string, string>> }) => {
    calls.push({ url, headers: init.headers });
    return respond();
  };
  return { calls, fetch };
}

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

const API_PARAMS = {
  url: "https://api.example.com/ventas",
  query: [{ name: "año", value: "2024" }],
  headers: [{ name: "Authorization", value: "Bearer t" }],
  records: "data",
};

async function runApi(
  respond: () => Promise<Response>,
  nodes = [flowNode("a", "core.source.api", API_PARAMS)],
) {
  const remote = fakeFetch(respond);
  const engine = createHarness({ catalog: [...coreCatalog, apiManifest], fetch: remote.fetch });
  const runId = await engine.setAndRun(flowOf(nodes, []), 1);
  const status = (nodeId: string) =>
    engine
      .events("node.status")
      .filter((event) => event.runId === runId && event.nodeId === nodeId)
      .at(-1);
  return { engine, remote, status };
}

const loads = (engine: ReturnType<typeof createHarness>) =>
  engine.sql.calls.filter((call) => call.method === "exec.load");

describe("createCoordinator: API sources", () => {
  it("asks the API with its query and headers and loads the records it answers", async () => {
    const { engine, remote, status } = await runApi(() => json({ data: [{ total: 1 }] }));

    expect(remote.calls).toEqual([
      {
        url: "https://api.example.com/ventas?a%C3%B1o=2024",
        headers: { Authorization: "Bearer t" },
      },
    ]);
    expect(loads(engine)).toHaveLength(1);
    expect(loads(engine)[0]?.params).toMatchObject({
      format: "json",
      location: { kind: "bytes", bytes: new TextEncoder().encode('[{"total":1}]') },
    });
    expect(status("a")?.state).toBe("done");
  });

  it("asks only once for the same request", async () => {
    const { remote } = await runApi(
      () => json({ data: [] }),
      [flowNode("a", "core.source.api", API_PARAMS), flowNode("b", "core.source.api", API_PARAMS)],
    );

    expect(remote.calls).toHaveLength(1);
  });

  it("fails the node with the status the API answered", async () => {
    const { status } = await runApi(() => json({ error: "no" }, 401));

    expect(status("a")).toMatchObject({
      state: "error",
      error: { code: "SOURCE_UNREADABLE", message: "La API respondió con el estado 401" },
    });
  });

  it("explains that a request the browser blocks may lack CORS", async () => {
    const { status } = await runApi(() => Promise.reject(new TypeError("Failed to fetch")));

    expect(status("a")).toMatchObject({ state: "error", error: { code: "SOURCE_UNREADABLE" } });
    expect(status("a")?.error?.hint).toContain("CORS");
  });

  it("fails the node when the records path does not lead to a list", async () => {
    const { status } = await runApi(() => json({ data: { total: 1 } }));

    expect(status("a")).toMatchObject({
      state: "error",
      error: { code: "SOURCE_UNREADABLE", message: 'En "data" no hay una lista de registros' },
    });
  });
});
