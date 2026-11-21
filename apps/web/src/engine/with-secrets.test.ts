import { expect, it } from "vitest";
import type { Flow, NodeManifest } from "@nodomics/protocol";
import { flowOf, nodeOf } from "../canvas/canvas-fixtures.ts";
import { withSecrets } from "./with-secrets.ts";

const API: NodeManifest = {
  id: "core.source.api",
  version: "0.1.0",
  name: "API",
  category: "Fuentes",
  inputs: [],
  outputs: [{ id: "out", type: "table" }],
  params: {
    type: "object",
    properties: {
      headers: { type: "array", "x-nodomics": { widget: "key-values" } },
      query: { type: "array", "x-nodomics": { widget: "key-values" } },
      untouched: { type: "array" },
    },
  },
  impl: { kind: "sql", template: "" },
};

const apiNode = () => ({
  ...nodeOf("api", API.id),
  params: {
    headers: [
      { name: "Authorization", secret: "token" },
      { name: "X-Plain", value: "plain" },
    ],
    query: [{ name: "key", secret: "missing", value: "stale" }],
    untouched: [{ name: "other", secret: "token" }],
  },
});

it("resolves only declared key-values without mutating the edited or exported flow", () => {
  const flow = flowOf([apiNode()]);
  const original = JSON.stringify(flow);

  const resolved = withSecrets(flow, [API], [{ name: "token", value: "Bearer hidden" }]);

  expect(resolved.nodes[0]?.params).toEqual({
    headers: [
      { name: "Authorization", value: "Bearer hidden" },
      { name: "X-Plain", value: "plain" },
    ],
    query: [{ name: "key" }],
    untouched: [{ name: "other", secret: "token" }],
  });
  expect(JSON.stringify(flow)).toBe(original);
  expect(original).not.toContain("Bearer hidden");
});

it("uses custom manifests and resolves API nodes inside every custom flow graph", () => {
  const composite: NodeManifest = {
    ...API,
    id: "personal.composite",
    impl: { kind: "flow", graph: { nodes: [apiNode()], edges: [] } },
  };
  const flow: Flow = {
    ...flowOf([apiNode(), nodeOf("nested", composite.id)]),
    customNodes: [API, composite],
  };

  const resolved = withSecrets(flow, [], [{ name: "token", value: "resolved" }]);

  expect(resolved.nodes[0]?.params["headers"]).toEqual([
    { name: "Authorization", value: "resolved" },
    { name: "X-Plain", value: "plain" },
  ]);
  const impl = resolved.customNodes?.[1]?.impl;
  expect(impl?.kind === "flow" && impl.graph.nodes[0]?.params["headers"]).toEqual([
    { name: "Authorization", value: "resolved" },
    { name: "X-Plain", value: "plain" },
  ]);
  expect(JSON.stringify(flow)).not.toContain("resolved");
});

it("leaves unknown nodes and non-list parameters unchanged", () => {
  const flow = flowOf([{ ...apiNode(), params: { headers: null } }, nodeOf("unknown", "unknown")]);
  expect(withSecrets(flow, [API], [])).toEqual(flow);
});
