import { expect, it } from "vitest";
import { createVoyageEmbeddings, DEFAULT_EMBEDDING_MODEL } from "../src/memory/embeddings.ts";

it("sends bearer key and input type", async () => {
  const calls: { url: string; init: RequestInit | undefined }[] = [];
  const fetcher: typeof fetch = (url, init) => {
    calls.push({
      url: typeof url === "string" ? url : url instanceof URL ? url.href : url.url,
      init,
    });
    return Promise.resolve(
      new Response(JSON.stringify({ data: [{ embedding: [0.2, 0.8] }] }), { status: 200 }),
    );
  };

  const result = await createVoyageEmbeddings({
    apiKey: "secret",
    fetch: fetcher,
    inputType: "query",
  }).embed(["fruit temperature"]);

  expect(result).toEqual({ ok: true, value: [[0.2, 0.8]] });
  expect(calls[0]?.url).toBe("https://api.voyageai.com/v1/embeddings");
  expect(calls[0]?.init?.headers).toEqual({
    Authorization: "Bearer secret",
    "Content-Type": "application/json",
  });
  expect(JSON.parse(typeof calls[0]?.init?.body === "string" ? calls[0].init.body : "")).toEqual({
    input: ["fruit temperature"],
    model: DEFAULT_EMBEDDING_MODEL,
    input_type: "query",
  });
});

it("maps http error to EmbedError without leaking key", async () => {
  const fetcher: typeof fetch = () => Promise.resolve(new Response("secret", { status: 401 }));

  const result = await createVoyageEmbeddings({ apiKey: "secret", fetch: fetcher }).embed(["text"]);

  expect(result).toEqual({
    ok: false,
    error: { code: "HTTP_ERROR", message: "Embedding request failed (status 401)." },
  });
  expect(JSON.stringify(result)).not.toContain("secret");
});

it("rejects malformed response", async () => {
  const fetcher: typeof fetch = () =>
    Promise.resolve(new Response(JSON.stringify({ data: [{ embedding: [1, "bad"] }] })));

  const result = await createVoyageEmbeddings({ apiKey: "secret", fetch: fetcher }).embed(["text"]);

  expect(result).toEqual({
    ok: false,
    error: { code: "MALFORMED_RESPONSE", message: "Embedding provider returned invalid vectors." },
  });
});
