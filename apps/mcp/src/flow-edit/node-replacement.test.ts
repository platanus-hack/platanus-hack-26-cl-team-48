import type { FlowNode } from "@nodomics/protocol";
import { describe, expect, it } from "vitest";
import { applyChanges, diffFlows } from "./index.ts";
import {
  edge,
  edgeEnds,
  errorOf,
  flowOf,
  node,
  sourceManifest,
  transformManifest,
  unwrap,
} from "./test-fixtures.ts";

const replacementCases: { label: string; replacement: FlowNode }[] = [
  { label: "type", replacement: node("x", "t.changed", { name: "x" }) },
  {
    label: "version",
    replacement: { ...node("x", "t.transform", { name: "x" }), version: "0.2.0" },
  },
];

function replacementFlows(replacement: FlowNode) {
  const manifests = [sourceManifest, transformManifest, { ...transformManifest, id: "t.changed" }];
  const base = flowOf(
    [node("src", "t.source"), node("x", "t.transform", { name: "x" })],
    [edge("src.out", "x.in")],
    manifests,
  );
  return { base, draft: flowOf([node("src", "t.source"), replacement], base.edges, manifests) };
}

describe.each(replacementCases)("node replacement changing $label", ({ replacement }) => {
  it("represents the replacement as removing and adding the same node id", () => {
    const { base, draft } = replacementFlows(replacement);

    const changes = diffFlows(base, draft);

    expect(changes).toContainEqual({
      id: "remove_node:x",
      kind: "remove_node",
      target: "x",
      before: base.nodes[1],
    });
    expect(changes).toContainEqual({
      id: "add_node:x",
      kind: "add_node",
      target: "x",
      after: replacement,
    });
  });

  it("applies the replacement and preserves the valid draft connections", () => {
    const { base, draft } = replacementFlows(replacement);

    const result = unwrap(
      applyChanges(
        base,
        draft,
        diffFlows(base, draft).map(({ id }) => id),
      ),
    );

    expect(result.nodes.find(({ id }) => id === "x")).toEqual(replacement);
    expect(edgeEnds(result)).toEqual(edgeEnds(draft));
    expect(diffFlows(result, draft)).toEqual([]);
  });

  it("rejects adding the replacement without removing the existing node", () => {
    const { base, draft } = replacementFlows(replacement);

    const message = errorOf(applyChanges(base, draft, ["add_node:x"]));

    expect(message).toContain("x");
    expect(message).toMatch(/duplicate|already|duplicado|existe/i);
  });
});
