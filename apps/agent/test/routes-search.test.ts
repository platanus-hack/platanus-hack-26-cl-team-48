import { ok } from "@nodomics/protocol";
import { expect, it } from "vitest";
import type { ComponentCard } from "../src/contracts/component-card.ts";
import { createSearchRoute } from "../src/http/routes/search.ts";
import type { RouteRequest } from "../src/http/route.ts";
import { indexComponent } from "../src/memory/indexer.ts";
import { createFakeSearchIndex } from "../src/memory/search.ts";
import type { EmbeddingsPort } from "../src/memory/embeddings.ts";

const request = (query: Record<string, string>): RouteRequest => ({
  params: {},
  query,
  identity: { userId: "u1", accessToken: "token" },
  rawBody: "",
});
const card = (id: string): ComponentCard => ({
  id,
  kind: "flow",
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

it("search route returns 200 with cards ordered by similarity", async () => {
  const index = createFakeSearchIndex();
  await index.upsert("far", card("far"), [0, 1]);
  await index.upsert("near", card("near"), [1, 0]);
  const route = createSearchRoute({
    embeddings: { embed: () => Promise.resolve(ok([[1, 0]])) },
    index,
  });

  const reply = await route.handle(request({ q: "fruit", k: "2" }));

  expect([route.method, route.path]).toEqual(["GET", "/agent/search"]);
  expect(reply).toEqual({ status: 200, body: { cards: [card("near"), card("far")] } });
});

it.each([
  {},
  { q: "" },
  { q: "x".repeat(201) },
  { q: "fruit", k: "0" },
  { q: "fruit", k: "21" },
  { q: "fruit", k: "1.5" },
])("search route rejects invalid q or k %j", async (query) => {
  const route = createSearchRoute({
    embeddings: { embed: () => Promise.resolve(ok([[1]])) },
    index: createFakeSearchIndex(),
  });

  expect((await route.handle(request(query))).status).toBe(400);
});

it("fruit temperature query finds the strawberry tool", async () => {
  const index = createFakeSearchIndex();
  const embeddings: EmbeddingsPort = {
    embed: (texts) => Promise.resolve(ok(texts.map(vectorFor))),
  };
  const context = { domain: "agronomía", crop: "fresa", region: "sur" };
  for (const flow of [
    { id: "strawberry", name: "Cosecha de fresa", summary: "Temperatura de fruta" },
    { id: "thermal", name: "Carga térmica", summary: "Energía de cámara" },
    { id: "frost", name: "Alerta de heladas", summary: "Protección de cultivo" },
  ])
    await indexComponent({ embeddings, index }, { flow, context });

  const reply = await createSearchRoute({ embeddings, index }).handle(
    request({ q: "calculadora de temperatura de fruta", k: "3" }),
  );

  expect(reply.status).toBe(200);
  expect(reply.body).toMatchObject({
    cards: [{ id: "strawberry" }, { id: "thermal" }, { id: "frost" }],
  });
});

function vectorFor(text: string): number[] {
  if (text.includes("temperatura de fruta") || text.includes("Temperatura de fruta"))
    return [1, 0, 0];
  if (text.includes("Carga térmica")) return [0, 1, 0];
  return [0, 0, 1];
}
