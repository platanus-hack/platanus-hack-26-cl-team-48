import { err, ok } from "@nodomics/protocol";
import { expect, it } from "vitest";
import type { ComponentCard } from "../src/contracts/component-card.ts";
import { createVoyageEmbeddings } from "../src/memory/embeddings.ts";
import { indexComponent } from "../src/memory/indexer.ts";
import type { SearchIndexPort } from "../src/memory/search.ts";

const INPUT = {
  flow: { id: "fruit", name: "Cosecha de fresa", summary: "Calcula temperatura de fruta" },
  manifests: {},
  history: [],
  context: { domain: "agronomía", crop: "fresa", region: "sur" },
};

it("indexes a card with its vector", async () => {
  const writes: { id: string; card: ComponentCard; vector: readonly number[] }[] = [];
  let body = "";
  const fetcher: typeof fetch = (_url, init) => {
    body = typeof init?.body === "string" ? init.body : "";
    return Promise.resolve(new Response(JSON.stringify({ data: [{ embedding: [0.8, 0.2] }] })));
  };
  const index: SearchIndexPort = {
    upsert: (id, card, vector) => {
      writes.push({ id, card, vector });
      return Promise.resolve(ok(undefined));
    },
    query: () => Promise.resolve(ok([])),
  };

  const result = await indexComponent(
    { embeddings: createVoyageEmbeddings({ apiKey: "key", fetch: fetcher }), index },
    INPUT,
  );

  expect(result.ok).toBe(true);
  expect(writes).toMatchObject([
    { id: "fruit", card: { name: "Cosecha de fresa" }, vector: [0.8, 0.2] },
  ]);
  expect(JSON.parse(body)).toMatchObject({
    input_type: "document",
    input: [expect.stringContaining("Cosecha de fresa")],
  });
});

it("embedding failure is reported, index untouched", async () => {
  let writes = 0;
  const index: SearchIndexPort = {
    upsert: () => {
      writes += 1;
      return Promise.resolve(ok(undefined));
    },
    query: () => Promise.resolve(ok([])),
  };

  const result = await indexComponent(
    {
      embeddings: { embed: () => Promise.resolve(err({ code: "NETWORK", message: "offline" })) },
      index,
    },
    INPUT,
  );

  expect(result).toEqual({
    ok: false,
    error: { code: "EMBED_FAILED", message: "Component embedding failed." },
  });
  expect(writes).toBe(0);
});
