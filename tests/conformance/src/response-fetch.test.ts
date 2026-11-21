import { expect, it } from "vitest";
import { createResponseFetch, parseResponses } from "./response-fetch.ts";

it("serves JSON and string bodies with the declared status", async () => {
  const fetch = createResponseFetch(
    parseResponses({
      "https://api.test/json": { body: { items: [1] } },
      "https://api.test/text": { body: "unavailable", status: 503 },
    }),
  );

  expect(await (await fetch("https://api.test/json")).json()).toEqual({ items: [1] });
  const response = await fetch("https://api.test/text");
  expect(response.status).toBe(503);
  expect(await response.text()).toBe("unavailable");
});

it("returns 404 for a URL without a response, including a different query", async () => {
  const fetch = createResponseFetch(
    parseResponses({
      "https://api.test/items?region=Norte": { body: [] },
    }),
  );

  expect((await fetch("https://api.test/items")).status).toBe(404);
});

it.each([null, [], { url: {} }, { url: { body: [], status: "200" } }])(
  "rejects malformed responses at the case boundary: %j",
  (value) => {
    expect(() => parseResponses(value)).toThrow();
  },
);
