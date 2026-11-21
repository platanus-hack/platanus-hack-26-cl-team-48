import { expect, it } from "vitest";
import { coreNodes } from "@nodomics/nodes-core";
import { Flow, parse } from "@nodomics/protocol";
import { caseToFlow } from "./case-to-flow.ts";

const table = {
  columns: [{ name: 'a,"b', type: "text" as const }],
  rows: [['a,"b'], [null], ["a\nb"]],
};

it("builds a parsed flow with one source per supplied input", () => {
  const manifest = coreNodes.find((node) => node.id === "core.join");
  if (!manifest) throw new Error("Missing join manifest");
  const flow = caseToFlow(
    manifest,
    { name: "join", params: {}, inputs: { left: table, right: table }, expected: {} },
    { left: "s1", right: "s2" },
  );
  expect(parse(Flow, flow).ok).toBe(true);
  expect(flow.nodes.map((node) => node.params)).toEqual([
    { sourceId: "s1" },
    { sourceId: "s2" },
    {},
  ]);
  expect(flow.edges.map((edge) => edge.to.port)).toEqual(["left", "right"]);
});
