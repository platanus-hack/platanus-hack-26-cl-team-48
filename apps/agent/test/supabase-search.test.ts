import type { SupabaseClient } from "@supabase/supabase-js";
import { expect, it } from "vitest";
import type { ComponentCard } from "../src/contracts/component-card.ts";
import { createSupabaseSearchIndex } from "../src/memory/supabase-search.ts";

const CARD: ComponentCard = {
  id: "fruit",
  kind: "node",
  name: "Fruit",
  summary: "Fruit temperature",
  inputs: [],
  outputs: [],
  params: [],
  process: "",
  connections: [],
  assumptions: [],
  context: { domain: "", crop: "", region: "" },
  lineage: { parent: "", author: "", adapted_by: "" },
  history: [],
};

it("upserts a card and vector through the injected Supabase client", async () => {
  const calls: unknown[] = [];
  const client = {
    from: (table: string) => ({
      upsert: (row: unknown) => {
        calls.push([table, row]);
        return Promise.resolve({ data: null, error: null });
      },
    }),
  } as unknown as SupabaseClient;

  const result = await createSupabaseSearchIndex(client).upsert("fruit", CARD, [0.25, 0.75]);

  expect(result).toEqual({ ok: true, value: undefined });
  expect(calls).toEqual([
    ["agent_component_cards", { id: "fruit", card: CARD, embedding: "[0.25,0.75]" }],
  ]);
});

it("queries the match function and parses returned cards", async () => {
  const calls: unknown[] = [];
  const client = {
    rpc: (name: string, args: unknown) => {
      calls.push([name, args]);
      return Promise.resolve({ data: [{ card: CARD }], error: null });
    },
  } as unknown as SupabaseClient;

  const result = await createSupabaseSearchIndex(client).query([1, 0], 3);

  expect(result).toEqual({ ok: true, value: [CARD] });
  expect(calls).toEqual([["match_agent_components", { query: "[1,0]", k: 3 }]]);
});

it("maps a Supabase error to a Result", async () => {
  const client = {
    rpc: () => Promise.resolve({ data: null, error: { message: "db unavailable" } }),
  } as unknown as SupabaseClient;

  const result = await createSupabaseSearchIndex(client).query([1], 1);

  expect(result).toEqual({
    ok: false,
    error: { code: "INDEX_ERROR", message: "Component search failed." },
  });
});
