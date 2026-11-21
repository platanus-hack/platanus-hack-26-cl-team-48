import type { FlowEdge } from "@nodomics/protocol";
import { describe, expect, it } from "vitest";
import { flowNode, flowOf } from "./testing/catalog-fixtures.ts";
import { createHarness } from "./testing/coordinator-harness.ts";

const link = (from: [string, string], to: [string, string]): FlowEdge => ({
  id: `${from.join(".")}-${to.join(".")}`,
  from: { node: from[0], port: from[1] },
  to: { node: to[0], port: to[1] },
});

const harness = () =>
  createHarness({
    presetSources: { src_1: { format: "csv", location: { kind: "url", url: "https://x/v.csv" } } },
  });

const entry = flowNode("e", "flow.node", {
  name: "Ventas filtradas",
  inputs: [
    { name: "Ventas", type: "table" },
    { name: "Clientes", type: "table" },
  ],
});

const testedFlow = flowOf(
  [
    flowNode("s", "core.source", { sourceId: "src_1" }),
    entry,
    flowNode("f", "core.filter", { column: "x", value: "1" }),
  ],
  [link(["s", "out"], ["e", "ventas"]), link(["e", "ventas"], ["f", "in"])],
);

describe("createCoordinator: the node entry of a flow used as a node", () => {
  it("passes the test data of each input through to its output, feeding the next node", async () => {
    const engine = harness();
    const flow = flowOf(
      [...testedFlow.nodes, flowNode("c", "core.source", { sourceId: "src_1" })],
      [...testedFlow.edges, link(["c", "out"], ["e", "clientes"])],
    );

    const runId = await engine.setAndRun(flow, 1);

    expect(engine.statesOf(runId, "e").at(-1)).toBe("done");
    expect(engine.statesOf(runId, "f").at(-1)).toBe("done");
    expect(
      engine
        .events("node.result")
        .filter((result) => result.nodeId === "e")
        .map((result) => result.port),
    ).toEqual(["ventas", "clientes"]);
    expect(engine.sql.tasks).toContainEqual(
      expect.objectContaining({ query: 'SELECT * FROM "clientes"' }),
    );
  });

  it("asks for the test data of an input that has none", async () => {
    const engine = harness();

    await engine.coordinator["flow.set"]({ rev: 1, flow: testedFlow });
    const accepted = await engine.coordinator["flow.set"]({ rev: 2, flow: testedFlow });

    expect(accepted.errors).toContainEqual(
      expect.objectContaining({
        nodeId: "e",
        code: "INPUT_MISSING",
        message: 'Conecta la entrada "Clientes"',
      }),
    );
  });

  it("infers the columns of an output from its test data", async () => {
    const engine = harness();
    await engine.coordinator["flow.set"]({ rev: 1, flow: testedFlow });

    const inferred = await engine.coordinator["schema.infer"]({ nodeId: "e", port: "ventas" });

    expect(inferred).toMatchObject({ ok: true });
  });

  it("finishes the node output of the flow being edited once its input ran", async () => {
    const engine = harness();
    const flow = flowOf(
      [
        ...testedFlow.nodes,
        flowNode("c", "core.source", { sourceId: "src_1" }),
        flowNode("o", "flow.output", { name: "Resultado" }),
      ],
      [...testedFlow.edges, link(["c", "out"], ["e", "clientes"]), link(["f", "out"], ["o", "in"])],
    );

    await engine.coordinator["flow.set"]({ rev: 1, flow });
    const runId = await engine.run(1, ["o"]);

    expect(engine.statesOf(runId, "o").at(-1)).toBe("done");
  });
});
