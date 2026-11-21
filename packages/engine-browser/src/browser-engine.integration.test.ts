import { createDuckDbExecutor } from "@nodomics/executor-duckdb-wasm";
import {
  FLOW_FORMAT,
  NepNotifications,
  NepRequests,
  parse,
  toExecutorPort,
  type FlowNode,
} from "@nodomics/protocol";
import { createMemoryTransportPair, createPeer } from "@nodomics/rpc";
import { expect, it } from "vitest";
import { createBrowserEngine } from "./index.ts";
import { openNodeDuckDb } from "./testing/node-duckdb.ts";

const STARTUP_TIMEOUT_MS = 120_000;

const node = (id: string, type: string, params: FlowNode["params"]): FlowNode => ({
  id,
  type,
  version: "0.1.0",
  params,
  position: { x: 0, y: 0 },
});

it(
  "runs an uploaded CSV through the official filter and returns a page with real DuckDB",
  async () => {
    const database = await openNodeDuckDb();
    const [left, right] = createMemoryTransportPair();
    const client = createPeer(left);
    const server = createPeer(right);
    const dispose = createBrowserEngine({
      executors: [toExecutorPort(createDuckDbExecutor(database))],
      config: { mode: "browser" },
    }).serve(server);
    const results: string[] = [];
    const stopResults = client.on("node.result", (raw) => {
      const event = parse(NepNotifications["node.result"], raw);
      if (event.ok && event.value.nodeId === "filter") results.push(event.value.ref.id);
    });
    const finished = new Promise((resolve) => {
      const stop = client.on("run.finished", (event) => {
        stop();
        resolve(event);
      });
    });
    try {
      const source = parse(
        NepRequests["source.add"].result,
        await client.request("source.add", {
          kind: "upload",
          name: "ventas.csv",
          file: new TextEncoder().encode("region,amount\nnorte,10\nsur,20\nnorte,30\n"),
        }),
      );
      if (!source.ok) throw new Error("Invalid source response");
      await expect(
        client.request("flow.set", {
          rev: 1,
          flow: {
            format: FLOW_FORMAT,
            nodes: [
              node("source", "core.source.csv", { sourceId: source.value.sourceId }),
              node("filter", "core.filter", { column: "region", value: "norte" }),
            ],
            edges: [
              {
                id: "connection",
                from: { node: "source", port: "out" },
                to: { node: "filter", port: "in" },
              },
            ],
          },
        }),
      ).resolves.toMatchObject({ errors: [] });

      await client.request("flow.run", { rev: 1 });
      await expect(finished).resolves.toMatchObject({ status: "done" });
      expect(results).toHaveLength(1);
      await expect(
        client.request("data.page", {
          ref: results[0],
          offset: 0,
          limit: 10,
          sort: { column: "amount", direction: "asc" },
        }),
      ).resolves.toMatchObject({
        rows: [
          ["norte", 10],
          ["norte", 30],
        ],
        total: 2,
      });
    } finally {
      stopResults();
      dispose();
      client.close();
      server.close();
      database.dispose();
    }
  },
  STARTUP_TIMEOUT_MS,
);
