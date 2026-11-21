import { NepErrorCode } from "@nodomics/protocol";
import { describe, expect, it } from "vitest";
import { edge, flowNode, flowOf } from "./testing/catalog-fixtures.ts";
import { createHarness } from "./testing/coordinator-harness.ts";
import { encodeText, FAKE_COMPLETION } from "./testing/fake-executor.ts";

const sourceToPython = (value = "1") =>
  flowOf(
    [
      flowNode("s", "core.source", { sourceId: "src_1" }),
      flowNode("f", "core.filter", { column: "x", value }),
      flowNode("p", "core.python"),
    ],
    [edge("s", "f"), edge("f", "p")],
  );

const withFigures = (pythonFiguresPerTask = 2) =>
  createHarness({
    pythonFiguresPerTask,
    presetSources: { src_1: { format: "csv", location: { kind: "url", url: "https://x/v.csv" } } },
  });

describe("createCoordinator: figures", () => {
  it("announces the figures a node showed, after its results", async () => {
    const harness = withFigures();

    const runId = await harness.setAndRun(sourceToPython(), 1);

    const [display] = harness.events("node.display");
    expect(display).toMatchObject({ rev: 1, runId, nodeId: "p" });
    expect(display?.displays.map((figure) => figure.id)).toEqual(harness.python.heldDisplayIds());
    expect(display?.displays).toHaveLength(2);
  });

  it("announces nothing for nodes that showed no figures", async () => {
    const harness = withFigures(0);

    await harness.setAndRun(sourceToPython(), 1);

    expect(harness.events("node.display")).toEqual([]);
  });

  it("announces the cached figures again when the node did not have to run", async () => {
    const harness = withFigures();
    await harness.setAndRun(sourceToPython(), 1);
    const [first] = harness.events("node.display");

    const runId = await harness.setAndRun(sourceToPython(), 2);

    expect(harness.statesOf(runId, "p")).toContain("cached");
    expect(harness.events("node.display").at(-1)).toEqual({ ...first, rev: 2, runId });
  });

  it("serves a figure's bytes from the executor that holds it", async () => {
    const harness = withFigures();
    await harness.setAndRun(sourceToPython(), 1);
    const [figure] = harness.events("node.display")[0]?.displays ?? [];

    const content = await harness.coordinator["data.display"]({ ref: figure?.id ?? "" });

    expect(content).toEqual({ mime: "image/png", bytes: encodeText(figure?.id ?? "") });
  });

  it("releases the figures with the results of a node that is no longer in the flow", async () => {
    const harness = withFigures();
    await harness.setAndRun(sourceToPython("1"), 1);
    const [figure] = harness.events("node.display")[0]?.displays ?? [];

    await harness.setAndRun(sourceToPython("2"), 2);

    expect(harness.python.heldDisplayIds()).not.toContain(figure?.id);
    await expect(
      harness.coordinator["data.display"]({ ref: figure?.id ?? "" }),
    ).rejects.toMatchObject({ code: NepErrorCode.RESULT_EXPIRED });
  });
});

describe("createCoordinator: code.complete", () => {
  const position = { code: "import pandas as pd\npd.", line: 2, column: 3 };

  it("asks the executor that would run the node", async () => {
    const harness = withFigures();
    await harness.coordinator["flow.set"]({ rev: 1, flow: sourceToPython() });

    const completions = await harness.coordinator["code.complete"]({ nodeId: "p", ...position });

    expect(completions).toEqual({ items: [FAKE_COMPLETION] });
    expect(harness.python.calls.at(-1)).toEqual({ method: "exec.complete", params: position });
  });

  it("offers nothing for a node that does not run code", async () => {
    const harness = withFigures();
    await harness.coordinator["flow.set"]({ rev: 1, flow: sourceToPython() });

    const completions = await harness.coordinator["code.complete"]({ nodeId: "f", ...position });

    expect(completions).toEqual({ items: [] });
    expect(harness.sql.calls.map((call) => call.method)).not.toContain("exec.complete");
  });

  it("rejects a node that is not in the current flow", async () => {
    const harness = withFigures();
    await harness.coordinator["flow.set"]({ rev: 1, flow: sourceToPython() });

    await expect(
      harness.coordinator["code.complete"]({ nodeId: "zz", ...position }),
    ).rejects.toMatchObject({ code: NepErrorCode.UNKNOWN_NODE });
  });
});
