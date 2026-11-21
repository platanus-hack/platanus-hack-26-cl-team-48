import { expect, it, vi } from "vitest";
import { edge, flowNode, flowOf } from "./testing/catalog-fixtures.ts";
import { queryFlow, queryHarness } from "./testing/query-fixtures.ts";

it.each([false, true])(
  "protects the current revision when an old run finishes (cancelled=%s)",
  async (isCancelled) => {
    const harness = queryHarness();
    const release = harness.sql.holdRuns();
    await harness.coordinator["flow.set"]({ rev: 1, flow: queryFlow("+") });
    const old = await harness.coordinator["flow.run"]({ rev: 1 });
    await vi.waitFor(() => {
      expect(harness.sql.calls.some((call) => call.method === "exec.run")).toBe(true);
    });
    harness.sql.holdRuns()();
    await harness.setAndRun(queryFlow("-"), 2);
    const current = harness.events("node.result").at(-1)?.ref;
    if (current === undefined) throw new Error("Expected current result");

    if (isCancelled) await harness.coordinator["run.cancel"]({ runId: old.runId });
    release();
    await harness.finished(old.runId);

    await expect(
      harness.coordinator["data.page"]({ ref: current.id, offset: 0, limit: 1 }),
    ).resolves.toMatchObject({ total: 3 });
  },
);

it("protects the latest flow even before it runs", async () => {
  const harness = queryHarness();
  await harness.setAndRun(queryFlow("+"), 1);
  const current = harness.events("node.result")[0]?.ref;
  if (current === undefined) throw new Error("Expected current result");
  const release = harness.sql.holdRuns();
  await harness.coordinator["flow.set"]({ rev: 2, flow: queryFlow("-") });
  const old = await harness.coordinator["flow.run"]({ rev: 2 });
  await vi.waitFor(() => {
    expect(harness.sql.calls.filter((call) => call.method === "exec.run")).toHaveLength(2);
  });
  await harness.coordinator["flow.set"]({ rev: 3, flow: queryFlow("+") });

  release();
  await harness.finished(old.runId);

  await expect(
    harness.coordinator["data.page"]({ ref: current.id, offset: 0, limit: 1 }),
  ).resolves.toMatchObject({ total: 3 });
});

it("releases every result of equivalent nodes when the flow is emptied", async () => {
  const harness = queryHarness();
  await harness.setAndRun(
    flowOf(
      [flowNode("a", "test.query", { op: "+" }), flowNode("b", "test.query", { op: "+" })],
      [],
    ),
    1,
  );

  await harness.setAndRun(flowOf([], []), 2);

  expect(harness.sql.heldResultIds()).toEqual([]);
});

it("keeps the current result when equivalent concurrent runs finish out of order", async () => {
  const harness = queryHarness();
  const release = harness.sql.holdRuns();
  await harness.coordinator["flow.set"]({ rev: 1, flow: queryFlow("+") });
  const old = await harness.coordinator["flow.run"]({ rev: 1 });
  await vi.waitFor(() => {
    expect(harness.sql.calls.some((call) => call.method === "exec.run")).toBe(true);
  });
  harness.sql.holdRuns()();
  await harness.setAndRun(queryFlow("+"), 2);
  const current = harness.events("node.result").at(-1)?.ref;
  if (current === undefined) throw new Error("Expected current result");

  release();
  await harness.finished(old.runId);

  await expect(
    harness.coordinator["data.page"]({ ref: current.id, offset: 0, limit: 1 }),
  ).resolves.toMatchObject({ total: 3 });
});

it("protects results needed by an active run after flow.set replaces its flow", async () => {
  const harness = queryHarness();
  await harness.setAndRun(queryFlow("+"), 1);
  const upstream = harness.events("node.result")[0]?.ref;
  if (upstream === undefined) throw new Error("Expected upstream result");
  const release = harness.sql.holdRuns();
  await harness.coordinator["flow.set"]({
    rev: 2,
    flow: flowOf(
      [
        flowNode("q", "test.query", { op: "+" }),
        flowNode("f", "core.filter", { column: "x", value: "1" }),
      ],
      [edge("q", "f")],
    ),
  });
  const active = await harness.coordinator["flow.run"]({ rev: 2 });
  await vi.waitFor(() => {
    expect(harness.sql.calls.filter((call) => call.method === "exec.run")).toHaveLength(2);
  });

  await harness.setAndRun(flowOf([], []), 3);

  await expect(
    harness.coordinator["data.page"]({ ref: upstream.id, offset: 0, limit: 1 }),
  ).resolves.toMatchObject({ total: 3 });
  release();
  await harness.finished(active.runId);
  expect(harness.sql.heldResultIds()).toEqual([]);
});
