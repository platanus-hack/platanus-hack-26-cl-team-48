import { FEED_PATHS } from "@nodomics/profile";
import { describe, expect, it } from "vitest";
import { ANA_CARD, componentHit, profileHit } from "./feed-fixtures.ts";
import { createHttpFeedService } from "./http-feed-service.ts";

const BASE_URL = "https://agent.example.com";
const TOKEN = "token-123";

type Call = { readonly url: string; readonly init: RequestInit | undefined };
type Reply = { readonly status: number; readonly body?: unknown } | Error;

function urlOf(input: Parameters<typeof fetch>[0]): string {
  if (typeof input === "string") return input;
  return input instanceof URL ? input.href : input.url;
}

function setup(reply: Reply = { status: 200, body: {} }, hasToken = true) {
  const calls: Call[] = [];
  const fakeFetch = (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
    calls.push({ url: urlOf(input), init });
    if (reply instanceof Error) return Promise.reject(reply);
    return Promise.resolve(
      new Response(reply.body === undefined ? null : JSON.stringify(reply.body), {
        status: reply.status,
        headers: { "content-type": "application/json" },
      }),
    );
  };
  const service = createHttpFeedService({
    baseUrl: BASE_URL,
    getAccessToken: () => Promise.resolve(hasToken ? TOKEN : undefined),
    fetch: fakeFetch,
  });
  return { service, calls };
}

type Service = ReturnType<typeof setup>["service"];

const headerOf = (call: Call | undefined, name: string) =>
  new Headers(call?.init?.headers).get(name);
const bodyOf = (call: Call | undefined): unknown =>
  JSON.parse(typeof call?.init?.body === "string" ? call.init.body : "null");

describe("createHttpFeedService requests", () => {
  it("searches with a GET to the search path and the encoded query", async () => {
    const { service, calls } = setup({ status: 200, body: { results: [] } });

    await service.search("brotes & ganado");

    expect({ url: calls[0]?.url, method: calls[0]?.init?.method ?? "GET" }).toEqual({
      url: `${BASE_URL}${FEED_PATHS.search}?q=${encodeURIComponent("brotes & ganado")}`,
      method: "GET",
    });
  });

  it("asks for matches with a GET to the matches path", async () => {
    const { service, calls } = setup({ status: 200, body: { results: [] } });

    await service.matches();

    expect({ url: calls[0]?.url, method: calls[0]?.init?.method ?? "GET" }).toEqual({
      url: `${BASE_URL}${FEED_PATHS.matches}`,
      method: "GET",
    });
  });

  it("fetches a card with a GET to the cards path and the encoded handle", async () => {
    const { service, calls } = setup({ status: 200, body: { card: ANA_CARD } });

    await service.card("ana/pérez");

    expect(calls[0]?.url).toBe(`${BASE_URL}/feed/cards/${encodeURIComponent("ana/pérez")}`);
  });

  it("saves a profile with a POST whose JSON body wraps the card", async () => {
    const { service, calls } = setup({ status: 200, body: { card: ANA_CARD } });

    await service.saveProfile(ANA_CARD);

    expect({
      url: calls[0]?.url,
      method: calls[0]?.init?.method,
      body: bodyOf(calls[0]),
    }).toEqual({
      url: `${BASE_URL}${FEED_PATHS.profile}`,
      method: "POST",
      body: { card: ANA_CARD },
    });
  });

  it("extracts a profile with a POST whose JSON body is the request", async () => {
    const { service, calls } = setup({ status: 200, body: { card: ANA_CARD } });

    await service.extractProfile({ text: "mi cv", githubLogin: "ana" });

    expect({
      url: calls[0]?.url,
      method: calls[0]?.init?.method,
      body: bodyOf(calls[0]),
    }).toEqual({
      url: `${BASE_URL}${FEED_PATHS.registration}`,
      method: "POST",
      body: { text: "mi cv", githubLogin: "ana" },
    });
  });

  it("sends the bearer token on every call", async () => {
    const { service, calls } = setup({ status: 200, body: { results: [] } });

    await service.search("x");
    await service.matches();

    expect(calls.map((call) => headerOf(call, "authorization"))).toEqual([
      `Bearer ${TOKEN}`,
      `Bearer ${TOKEN}`,
    ]);
  });
});

describe("createHttpFeedService without a token", () => {
  it.each([
    ["search", (s: Service) => s.search("x")],
    ["matches", (s: Service) => s.matches()],
    ["card", (s: Service) => s.card("ana")],
    ["saveProfile", (s: Service) => s.saveProfile(ANA_CARD)],
    ["extractProfile", (s: Service) => s.extractProfile({ text: "x" })],
  ])("returns UNAUTHENTICATED from %s and never calls fetch", async (_name, call) => {
    const { service, calls } = setup({ status: 200, body: {} }, false);

    const result = await call(service);

    expect({ result, calls: calls.length }).toEqual({
      result: { ok: false, error: { code: "UNAUTHENTICATED" } },
      calls: 0,
    });
  });
});

describe("createHttpFeedService replies", () => {
  it("returns the hits of a search reply", async () => {
    const hits = [profileHit("beto", "Beto Ruiz"), componentHit("node", "n1", "Limpiar")];
    const { service } = setup({ status: 200, body: { results: hits } });

    const result = await service.search("x");

    expect(result).toEqual({ ok: true, value: hits });
  });

  it("returns the hits of a matches reply", async () => {
    const hits = [profileHit("beto", "Beto Ruiz")];
    const { service } = setup({ status: 200, body: { results: hits } });

    const result = await service.matches();

    expect(result).toEqual({ ok: true, value: hits });
  });

  it("returns UNAVAILABLE when a search reply is malformed", async () => {
    const { service } = setup({ status: 200, body: { results: [{ kind: "other" }] } });

    const result = await service.search("x");

    expect(result).toEqual({ ok: false, error: { code: "UNAVAILABLE" } });
  });

  it("returns the parsed card of a card reply", async () => {
    const { service } = setup({ status: 200, body: { card: ANA_CARD } });

    const result = await service.card("ana");

    expect(result).toEqual({ ok: true, value: ANA_CARD });
  });

  it("returns UNAVAILABLE when a card reply holds an invalid card", async () => {
    const { service } = setup({ status: 200, body: { card: { about: "" } } });

    const result = await service.card("ana");

    expect(result).toEqual({ ok: false, error: { code: "UNAVAILABLE" } });
  });

  it("returns an undefined card for a 404 on card", async () => {
    const { service } = setup({ status: 404, body: { error: "no_profile" } });

    const result = await service.card("nadie");

    expect(result).toEqual({ ok: true, value: undefined });
  });

  it("returns the saved card of a saveProfile reply", async () => {
    const { service } = setup({ status: 200, body: { card: ANA_CARD } });

    const result = await service.saveProfile(ANA_CARD);

    expect(result).toEqual({ ok: true, value: ANA_CARD });
  });

  it("returns the extracted card of a registration reply", async () => {
    const { service } = setup({ status: 200, body: { card: ANA_CARD } });

    const result = await service.extractProfile({ text: "cv" });

    expect(result).toEqual({ ok: true, value: ANA_CARD });
  });

  it("returns UNAUTHENTICATED for a 401", async () => {
    const { service } = setup({ status: 401, body: { error: "unauthenticated" } });

    const result = await service.matches();

    expect(result).toEqual({ ok: false, error: { code: "UNAUTHENTICATED" } });
  });

  it("returns INVALID_CARD with the issues for a 400 invalid_card", async () => {
    const issues = [{ path: "/about", message: "too short" }];
    const { service } = setup({ status: 400, body: { error: "invalid_card", issues } });

    const result = await service.saveProfile(ANA_CARD);

    expect(result).toEqual({ ok: false, error: { code: "INVALID_CARD", issues } });
  });

  it("returns NO_PROFILE for a 404 no_profile on matches", async () => {
    const { service } = setup({ status: 404, body: { error: "no_profile" } });

    const result = await service.matches();

    expect(result).toEqual({ ok: false, error: { code: "NO_PROFILE" } });
  });

  it("returns EXTRACTION_FAILED with the issues for a 422", async () => {
    const issues = [{ path: "/domains", message: "unreadable" }];
    const { service } = setup({ status: 422, body: { error: "extraction_failed", issues } });

    const result = await service.extractProfile({ text: "cv" });

    expect(result).toEqual({ ok: false, error: { code: "EXTRACTION_FAILED", issues } });
  });

  it("returns UNAVAILABLE for any other status", async () => {
    const { service } = setup({ status: 500, body: { error: "boom" } });

    const result = await service.search("x");

    expect(result).toEqual({ ok: false, error: { code: "UNAVAILABLE" } });
  });

  it("returns UNAVAILABLE on a network error", async () => {
    const { service } = setup(new TypeError("Failed to fetch"));

    const result = await service.matches();

    expect(result).toEqual({ ok: false, error: { code: "UNAVAILABLE" } });
  });
});
