import { ok } from "@nodomics/protocol";
import { expect, it } from "vitest";
import type { ComponentCard } from "../src/contracts/component-card.ts";
import { createFakeSearchIndex, searchComponents } from "../src/memory/search.ts";

const card = (id: string): ComponentCard => ({
  id,
  kind: "node",
  name: id,
  summary: id,
  inputs: [],
  outputs: [],
  params: [],
  process: "",
  connections: [],
  assumptions: [],
  context: { domain: "", crop: "", region: "" },
  lineage: { parent: "", author: "", adapted_by: "" },
  history: [],
});

it("finds the closest card first", async () => {
  const index = createFakeSearchIndex();
  await index.upsert("far", card("far"), [0, 1]);
  await index.upsert("near", card("near"), [1, 0]);

  const result = await searchComponents(
    { embeddings: { embed: () => Promise.resolve(ok([[1, 0]])) }, index },
    "fruit",
    2,
  );

  expect(result).toEqual({ ok: true, value: [card("near"), card("far")] });
});

it("k limits results", async () => {
  const index = createFakeSearchIndex();
  await index.upsert("a", card("a"), [1, 0]);
  await index.upsert("b", card("b"), [0, 1]);

  const result = await searchComponents(
    { embeddings: { embed: () => Promise.resolve(ok([[1, 0]])) }, index },
    "fruit",
    1,
  );

  expect(result).toEqual({ ok: true, value: [card("a")] });
});
