import { describe, expect, it } from "vitest";
import { CATALOG, manifestOf } from "./canvas-fixtures.ts";
import { groupLibrary } from "./library-groups.ts";

describe("groupLibrary", () => {
  it("groups nodes by category, keeping the catalog order of categories", () => {
    expect(
      groupLibrary(CATALOG).map(({ category, nodes }) => ({
        category,
        ids: nodes.map((node) => node.id),
      })),
    ).toEqual([
      { category: "Fuentes", ids: ["core.source.sample"] },
      { category: "Transformar", ids: ["core.filter", "core.join"] },
      { category: "Vistas", ids: ["core.view.bar"] },
      { category: "Python", ids: ["core.python.zscore"] },
    ]);
  });

  it("hides the boundary nodes that only make sense inside a flow-as-node", () => {
    const ids = groupLibrary(CATALOG).flatMap((group) => group.nodes.map((node) => node.id));

    expect(ids).not.toContain("flow.input");
  });

  it("lists a custom node only once even if the engine already knows it", () => {
    const custom = manifestOf("custom.mio", { category: "Mis nodos" });

    expect(groupLibrary([custom, custom]).at(0)?.nodes).toHaveLength(1);
  });
});

it("offers the entry and output while hiding legacy inputs", () => {
  const entry = manifestOf("flow.node", { impl: { kind: "builtin", name: "flow.node" } });
  const output = manifestOf("flow.output", { impl: { kind: "builtin", name: "flow.output" } });
  expect(
    groupLibrary([entry, output, ...CATALOG]).flatMap(({ nodes }) => nodes.map(({ id }) => id)),
  ).toEqual(expect.arrayContaining([entry.id, output.id]));
});
