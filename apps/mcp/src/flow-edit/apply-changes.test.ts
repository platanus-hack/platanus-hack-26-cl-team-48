import type { Flow } from "@nodomics/protocol";
import { describe, expect, it } from "vitest";
import { applyChanges, diffFlows } from "./index.ts";
import {
  deepFreeze,
  edge,
  edgeEnds,
  errorOf,
  flowOf,
  node,
  nodeById,
  pipelineFlow,
  transformManifest,
  unwrap,
} from "./test-fixtures.ts";

/** pipelineFlow plus: tr.n changed, a new sink node connected from tr, a code node, and src removed. */
const draftFlow = (): Flow => ({
  ...flowOf(
    [
      node("tr", "t.transform", { n: 9, name: "x" }),
      node("extra", "t.transform", { name: "y" }),
      node("py", "code.py"),
    ],
    [edge("tr.out", "extra.in"), edge("extra.out", "py.in")],
  ),
  customNodes: [{ ...transformManifest, id: "code.py" }],
});

const allIds = (base: Flow, draft: Flow): readonly string[] =>
  diffFlows(base, draft).map((change) => change.id);

describe("applyChanges", () => {
  it("reaches the draft when every change is chosen", () => {
    const [base, draft] = [pipelineFlow(), draftFlow()];

    const result = unwrap(applyChanges(base, draft, allIds(base, draft)));

    expect(diffFlows(result, draft)).toEqual([]);
  });

  it("leaves the base as it was when no change is chosen", () => {
    const base = pipelineFlow();

    const result = unwrap(applyChanges(base, draftFlow(), []));

    expect(diffFlows(base, result)).toEqual([]);
  });

  it("applies only the chosen param change", () => {
    const base = pipelineFlow();

    const result = unwrap(applyChanges(base, draftFlow(), ["set_param:tr.n"]));

    expect(nodeById(result, "tr")?.params).toEqual({ n: 9, name: "x" });
    expect(result.nodes.map((n) => n.id)).toEqual(["src", "tr"]);
    expect(edgeEnds(result)).toEqual(["src.out->tr.in"]);
  });

  it("applies a chosen node addition without its connections", () => {
    const base = pipelineFlow();

    const result = unwrap(applyChanges(base, draftFlow(), ["add_node:extra"]));

    expect(nodeById(result, "extra")).toMatchObject({ type: "t.transform", params: { name: "y" } });
    expect(edgeEnds(result)).toEqual(["src.out->tr.in"]);
  });

  it("applies a chosen connection together with the node it needs", () => {
    const base = pipelineFlow();

    const result = unwrap(
      applyChanges(base, draftFlow(), ["add_node:extra", "connect:tr.out->extra.in"]),
    );

    expect(edgeEnds(result)).toContain("tr.out->extra.in");
  });

  it("applies a code node with its custom manifest", () => {
    const base = pipelineFlow();

    const result = unwrap(applyChanges(base, draftFlow(), ["add_node:py", "add_custom_node:py"]));

    expect(nodeById(result, "py")?.type).toBe("code.py");
    expect(result.customNodes?.map((m) => m.id)).toEqual(["code.py"]);
  });

  it("returns an error for an id that is not in the diff", () => {
    const base = pipelineFlow();

    const message = errorOf(applyChanges(base, draftFlow(), ["set_param:tr.nope"]));

    expect(message).toContain("set_param:tr.nope");
  });

  it("returns an error when a chosen connection needs a node that was not chosen", () => {
    const base = pipelineFlow();

    const result = applyChanges(base, draftFlow(), ["connect:tr.out->extra.in"]);

    expect(result.ok).toBe(false);
  });

  it("does not mutate its arguments", () => {
    const [base, draft] = [deepFreeze(pipelineFlow()), deepFreeze(draftFlow())];

    const result = applyChanges(base, draft, allIds(pipelineFlow(), draftFlow()));

    expect(result.ok).toBe(true);
    expect(base).toEqual(pipelineFlow());
    expect(draft).toEqual(draftFlow());
  });
});
