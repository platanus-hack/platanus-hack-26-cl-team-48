import { describe, expect, it } from "vitest";
import { analyzeFlow } from "./analyze-flow.ts";
import { toCatalog } from "./catalog.ts";
import { selectTargets } from "./select-targets.ts";
import { coreCatalog, edge, flowNode, flowOf } from "./testing/catalog-fixtures.ts";

const analysis = analyzeFlow(
  flowOf(
    [
      flowNode("s", "core.source", { sourceId: "src_1" }),
      flowNode("d", "core.double-filter"),
      flowNode("p", "core.python"),
      flowNode("q", "core.python"),
    ],
    [edge("s", "d"), edge("d", "p"), edge("s", "q")],
  ),
  toCatalog(coreCatalog),
);

describe("selectTargets", () => {
  it("keeps every node when there are no targets", () => {
    expect([...selectTargets(analysis, undefined).keys()]).toEqual(["s", "d.a", "q", "d.b", "p"]);
  });

  it("keeps the targets and the nodes they read from, in order", () => {
    expect([...selectTargets(analysis, ["d"]).keys()]).toEqual(["s", "d.a", "d.b"]);
  });
});
