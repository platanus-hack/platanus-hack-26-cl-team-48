import type { NodeManifest } from "@nodomics/protocol";
import { expect, it } from "vitest";
import { createHarness } from "./testing/coordinator-harness.ts";
import {
  coreCatalog,
  doubleFilterManifest,
  edge,
  flowNode,
  flowOf,
} from "./testing/catalog-fixtures.ts";
import { queryManifest, queryHarness, compositeFlow } from "./testing/query-fixtures.ts";

it("emits aggregate states and output references alongside internal events", async () => {
  const harness = queryHarness();

  const runId = await harness.setAndRun(compositeFlow(), 1);

  expect(harness.statesOf(runId, "d")).toEqual(["queued", "running", "done"]);
  const internal = harness.events("node.result").find((event) => event.nodeId === "d.b");
  expect(harness.events("node.result")).toContainEqual({
    runId,
    rev: 1,
    nodeId: "d",
    port: "out",
    ref: internal?.ref,
  });
});

it("reports cached composite outputs on the next run", async () => {
  const harness = queryHarness();
  await harness.setAndRun(compositeFlow(), 1);

  const runId = await harness.setAndRun(compositeFlow(), 2);

  expect(harness.statesOf(runId, "d")).toEqual(["queued", "cached"]);
  expect(harness.events("node.result")).toContainEqual(
    expect.objectContaining({ runId, nodeId: "d", port: "out" }),
  );
});

it("propagates an internal failure to the composite", async () => {
  const harness = createHarness({
    catalog: [...coreCatalog, queryManifest],
    failWhen: (task) =>
      task.kind === "sql" && task.query.includes("WHERE")
        ? { code: "COLUMN_NOT_FOUND", message: "Missing column" }
        : undefined,
  });

  const runId = await harness.setAndRun(compositeFlow(), 1);

  expect(harness.statesOf(runId, "d")).toEqual(["queued", "running", "error"]);
  expect(harness.events("node.result").filter((event) => event.nodeId === "d")).toEqual([]);
});

it("marks a composite stale when an upstream error blocks all its nodes", async () => {
  const harness = createHarness({
    catalog: [...coreCatalog, queryManifest],
    failWhen: () => ({ code: "COLUMN_NOT_FOUND", message: "Invalid SQL" }),
  });

  const runId = await harness.setAndRun(compositeFlow(), 1);

  expect(harness.statesOf(runId, "d")).toEqual(["queued", "stale"]);
});

it("reports a cycle inside a composite on its own id", async () => {
  const cyclic: NodeManifest = {
    ...doubleFilterManifest,
    id: "test.cyclic",
    impl: {
      kind: "flow",
      graph: {
        nodes: [
          flowNode("a", "core.filter", { column: "x", value: "1" }),
          flowNode("b", "core.filter", { column: "x", value: "2" }),
        ],
        edges: [edge("a", "b"), edge("b", "a")],
      },
    },
  };
  const harness = createHarness({ catalog: [...coreCatalog, cyclic] });

  const runId = await harness.setAndRun(flowOf([flowNode("d", cyclic.id)], []), 1);

  expect(harness.statesOf(runId, "d")).toEqual(["queued", "error"]);
  expect(
    harness.events("node.status").find((event) => event.nodeId === "d" && event.state === "error"),
  ).toMatchObject({ error: { code: "CYCLE" } });
});

it("finishes a composite when only an internal target is included in the run", async () => {
  const harness = queryHarness();
  await harness.coordinator["flow.set"]({ rev: 1, flow: compositeFlow() });

  const runId = await harness.run(1, ["d.a"]);

  expect(harness.events("run.finished").at(-1)).toMatchObject({ executed: ["s", "d.a"] });
  expect(harness.statesOf(runId, "d.b")).toEqual([]);
  expect(harness.statesOf(runId, "d")).toEqual(["queued", "running", "done"]);
});

it("shows the figures of a code node inside a composite on the composite", async () => {
  const plotting: NodeManifest = {
    ...doubleFilterManifest,
    id: "test.plotting",
    impl: {
      kind: "flow",
      graph: {
        nodes: [
          flowNode("i", "flow.input", { name: "in" }),
          flowNode("p", "core.python"),
          flowNode("o", "flow.output", { name: "out" }),
        ],
        edges: [edge("i", "p"), edge("p", "o")],
      },
    },
  };
  const harness = createHarness({
    catalog: [...coreCatalog, queryManifest, plotting],
    pythonFiguresPerTask: 1,
  });

  const runId = await harness.setAndRun(
    flowOf(
      [flowNode("s", "test.query", { op: "+" }), flowNode("d", "test.plotting")],
      [edge("s", "d")],
    ),
    1,
  );

  const inner = harness.events("node.display").find((event) => event.nodeId === "d.p");
  expect(inner).toBeDefined();
  expect(harness.events("node.display")).toContainEqual({ ...inner, runId, nodeId: "d" });
});
