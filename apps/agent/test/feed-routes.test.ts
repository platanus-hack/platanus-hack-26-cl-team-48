import type { ProfileCard } from "@nodomics/profile";
import { err, ok, type Result } from "@nodomics/protocol";
import { describe, expect, it } from "vitest";
import { createFeedRoutes } from "../src/feed/feed-routes.ts";
import type { GithubSummaryPort } from "../src/feed/github-summary.ts";
import type {
  ExtractError,
  ExtractionSource,
  ProfileExtractorPort,
} from "../src/feed/profile-extractor.ts";
import type { Route, RouteReply, RouteRequest } from "../src/http/route.ts";
import type { UserIdentity } from "../src/mcp/mcp-port.ts";
import {
  EMBED_FAILURE,
  fakeEmbeddings,
  fakeStore,
  hit,
  STORE_FAILURE,
  validCard,
  type FakeStoreOptions,
} from "./feed-fixtures.ts";

const IDENTITY: UserIdentity = { userId: "user-1", accessToken: "token" };

type Options = {
  readonly store?: FakeStoreOptions;
  readonly failEmbeddings?: boolean;
  readonly extracted?: Result<unknown, ExtractError>;
  readonly github?: Awaited<ReturnType<GithubSummaryPort["summarize"]>>;
};

function setup(options: Options = {}) {
  const store = fakeStore(options.store);
  const identities: UserIdentity[] = [];
  const sources: ExtractionSource[] = [];
  const logins: string[] = [];
  const failing = options.failEmbeddings === true;
  const extractor: ProfileExtractorPort = {
    extract: (source) => {
      sources.push(source);
      return Promise.resolve(options.extracted ?? ok(validCard()));
    },
  };
  const github: GithubSummaryPort = {
    summarize: (login) => {
      logins.push(login);
      return Promise.resolve(options.github ?? ok("GITHUB SUMMARY"));
    },
  };
  const routes = createFeedRoutes({
    storeFor: (identity) => {
      identities.push(identity);
      return store;
    },
    documentEmbeddings: fakeEmbeddings(failing ? () => err(EMBED_FAILURE) : undefined),
    queryEmbeddings: fakeEmbeddings(failing ? () => err(EMBED_FAILURE) : undefined),
    extractor,
    github,
  });
  return { routes, store, identities, sources, logins };
}

function find(routes: readonly Route[], method: "GET" | "POST", path: string): Route {
  const route = routes.find((candidate) => candidate.method === method && candidate.path === path);
  if (!route) throw new Error(`route ${method} ${path} not found`);
  return route;
}

const request = (overrides: Partial<RouteRequest> = {}): RouteRequest => ({
  params: {},
  query: {},
  identity: IDENTITY,
  rawBody: "",
  ...overrides,
});

const call = (
  routes: readonly Route[],
  method: "GET" | "POST",
  path: string,
  overrides: Partial<RouteRequest> = {},
): Promise<RouteReply> => find(routes, method, path).handle(request(overrides));

const json = (value: unknown): string => JSON.stringify(value);

describe("POST /feed/profile", () => {
  const post = (routes: readonly Route[], rawBody: string) =>
    call(routes, "POST", "/feed/profile", { rawBody });

  it("saves the card under the caller and replies 200 with it", async () => {
    const card = validCard();
    const { routes, store, identities } = setup();

    const reply = await post(routes, json({ card }));

    expect(reply).toEqual({ status: 200, body: { card } });
    expect(identities).toEqual([IDENTITY]);
    expect(store.upserts[0]?.profileId).toBe("user-1");
  });

  it("replies 400 invalid_card with the issues for an invalid card", async () => {
    const { routes } = setup();

    const reply = await post(routes, json({ card: { about: "" } }));

    expect(reply.status).toBe(400);
    expect(reply.body).toMatchObject({ error: "invalid_card" });
    const issues = (reply.body as { issues: unknown[] }).issues;
    expect(issues.length).toBeGreaterThan(0);
  });

  it("replies 400 invalid_body for a body that is not JSON", async () => {
    const { routes } = setup();

    const reply = await post(routes, "not json");

    expect(reply).toEqual({ status: 400, body: { error: "invalid_body" } });
  });

  it("replies 400 invalid_body when the card is missing", async () => {
    const { routes } = setup();

    const reply = await post(routes, json({}));

    expect(reply).toEqual({ status: 400, body: { error: "invalid_body" } });
  });

  it("replies 502 embeddings_unavailable when embedding fails", async () => {
    const { routes } = setup({ failEmbeddings: true });

    const reply = await post(routes, json({ card: validCard() }));

    expect(reply).toEqual({ status: 502, body: { error: "embeddings_unavailable" } });
  });

  it("replies 502 store_unavailable when the store fails", async () => {
    const { routes } = setup({ store: { failWith: STORE_FAILURE } });

    const reply = await post(routes, json({ card: validCard() }));

    expect(reply).toEqual({ status: 502, body: { error: "store_unavailable" } });
  });
});

describe("GET /feed/cards/:handle", () => {
  const get = (routes: readonly Route[], handle: string) =>
    call(routes, "GET", "/feed/cards/:handle", { params: { handle } });

  it("replies 200 with the card", async () => {
    const card: ProfileCard = validCard();
    const { routes } = setup({ store: { byHandle: card } });

    const reply = await get(routes, "ana");

    expect(reply).toEqual({ status: 200, body: { card } });
  });

  it("replies 404 not_found when the handle has no card", async () => {
    const { routes } = setup();

    const reply = await get(routes, "ghost");

    expect(reply).toEqual({ status: 404, body: { error: "not_found" } });
  });

  it("replies 502 store_unavailable when the store fails", async () => {
    const { routes } = setup({ store: { failWith: STORE_FAILURE } });

    const reply = await get(routes, "ana");

    expect(reply).toEqual({ status: 502, body: { error: "store_unavailable" } });
  });
});

describe("GET /feed/search", () => {
  const search = (routes: readonly Route[], query: Record<string, string>) =>
    call(routes, "GET", "/feed/search", { query });

  it("replies 200 with the results and the default k of 20", async () => {
    const hits = [hit("ana")];
    const { routes, store } = setup({ store: { hits } });

    const reply = await search(routes, { q: "epidemiology" });

    expect(reply).toEqual({ status: 200, body: { results: hits } });
    expect(store.matchCalls[0]?.k).toBe(20);
  });

  it("trims the query before searching and honors k", async () => {
    const { routes, store } = setup();

    await search(routes, { q: "  spaced  ", k: "7" });

    expect(store.matchCalls[0]?.k).toBe(7);
  });

  it.each([
    ["missing q", {}],
    ["blank q", { q: "   " }],
    ["q over 200 chars", { q: "a".repeat(201) }],
    ["k of 0", { q: "x", k: "0" }],
    ["k over 50", { q: "x", k: "51" }],
    ["non-integer k", { q: "x", k: "2.5" }],
    ["non-numeric k", { q: "x", k: "many" }],
  ])("replies 400 invalid_query for %s", async (_name, query) => {
    const { routes, store } = setup();

    const reply = await search(routes, query);

    expect(reply).toEqual({ status: 400, body: { error: "invalid_query" } });
    expect(store.matchCalls).toEqual([]);
  });

  it("accepts the boundary values q of 200 chars and k of 50", async () => {
    const { routes } = setup();

    const reply = await search(routes, { q: "a".repeat(200), k: "50" });

    expect(reply.status).toBe(200);
  });

  it("replies 502 embeddings_unavailable when embedding fails", async () => {
    const { routes } = setup({ failEmbeddings: true });

    const reply = await search(routes, { q: "x" });

    expect(reply).toEqual({ status: 502, body: { error: "embeddings_unavailable" } });
  });

  it("replies 502 store_unavailable when the store fails", async () => {
    const { routes } = setup({ store: { failWith: STORE_FAILURE } });

    const reply = await search(routes, { q: "x" });

    expect(reply).toEqual({ status: 502, body: { error: "store_unavailable" } });
  });
});

describe("GET /feed/matches", () => {
  const matches = (routes: readonly Route[], query: Record<string, string> = {}) =>
    call(routes, "GET", "/feed/matches", { query });

  const own = () => ({
    profileId: "user-1",
    card: validCard(),
    offersEmbedding: [1, 0],
    seeksEmbedding: [0, 1],
    contentHash: "h",
    embeddingModel: "voyage-4",
  });

  it("replies 200 with the matches for the caller", async () => {
    const hits = [hit("ben")];
    const { routes, store } = setup({ store: { own: own(), hits } });

    const reply = await matches(routes, { k: "3" });

    expect(reply).toEqual({ status: 200, body: { results: hits } });
    expect(store.matchCalls).toEqual([{ query: [0, 1], k: 3, exclude: "user-1" }]);
  });

  it("uses a default k of 20", async () => {
    const { routes, store } = setup({ store: { own: own() } });

    await matches(routes);

    expect(store.matchCalls[0]?.k).toBe(20);
  });

  it("replies 404 no_profile when the caller has no card", async () => {
    const { routes } = setup();

    const reply = await matches(routes);

    expect(reply).toEqual({ status: 404, body: { error: "no_profile" } });
  });

  it.each(["0", "51", "1.5", "abc"])("replies 400 invalid_query for k=%s", async (k) => {
    const { routes } = setup({ store: { own: own() } });

    const reply = await matches(routes, { k });

    expect(reply).toEqual({ status: 400, body: { error: "invalid_query" } });
  });

  it("replies 502 store_unavailable when the store fails", async () => {
    const { routes } = setup({ store: { failWith: STORE_FAILURE } });

    const reply = await matches(routes);

    expect(reply).toEqual({ status: 502, body: { error: "store_unavailable" } });
  });
});

describe("POST /feed/registration", () => {
  const register = (routes: readonly Route[], body: unknown) =>
    call(routes, "POST", "/feed/registration", {
      rawBody: typeof body === "string" ? body : json(body),
    });

  it("extracts a card from pasted text without saving it", async () => {
    const card = validCard();
    const { routes, store, sources } = setup({ extracted: ok(card) });

    const reply = await register(routes, { text: "I study cows" });

    expect(reply).toEqual({ status: 200, body: { card } });
    expect(sources[0]?.text).toBe("I study cows");
    expect(store.upserts).toEqual([]);
  });

  it("passes the PDF to the extractor", async () => {
    const { routes, sources } = setup();
    const pdfBase64 = Buffer.from("%PDF-1.4 fake").toString("base64");

    const reply = await register(routes, { pdfBase64 });

    expect(reply.status).toBe(200);
    expect(sources[0]?.pdfBase64).toBe(pdfBase64);
  });

  it("passes the GitHub summary text to the extractor", async () => {
    const { routes, sources, logins } = setup();

    const reply = await register(routes, { githubLogin: "octocat" });

    expect(reply.status).toBe(200);
    expect(logins).toEqual(["octocat"]);
    expect(sources[0]?.githubSummary).toBe("GITHUB SUMMARY");
  });

  it.each([
    ["no source", {}],
    ["an empty object with unknown fields", { other: 1 }],
    ["an invalid github login", { githubLogin: "not valid!" }],
    ["text over 20000 chars", { text: "a".repeat(20001) }],
    ["a PDF over 20 MB", { pdfBase64: Buffer.alloc(20 * 1024 * 1024 + 1).toString("base64") }],
    ["a body that is not JSON", "not json"],
  ])("replies 400 invalid_input for %s", async (_name, body) => {
    const { routes, sources } = setup();

    const reply = await register(routes, body);

    expect(reply).toEqual({ status: 400, body: { error: "invalid_input" } });
    expect(sources).toEqual([]);
  });

  it("accepts text of exactly 20000 chars", async () => {
    const { routes } = setup();

    const reply = await register(routes, { text: "a".repeat(20000) });

    expect(reply.status).toBe(200);
  });

  it("replies 422 extraction_failed with issues when the extracted card is invalid", async () => {
    const { routes } = setup({ extracted: ok({ about: "" }) });

    const reply = await register(routes, { text: "hello" });

    expect(reply.status).toBe(422);
    expect(reply.body).toMatchObject({ error: "extraction_failed" });
    expect((reply.body as { issues: unknown[] }).issues.length).toBeGreaterThan(0);
  });

  it("replies 502 upstream_unavailable when the extractor fails", async () => {
    const { routes } = setup({ extracted: err({ code: "UPSTREAM", message: "down" }) });

    const reply = await register(routes, { text: "hello" });

    expect(reply).toEqual({ status: 502, body: { error: "upstream_unavailable" } });
  });

  it("replies 502 upstream_unavailable when GitHub fails", async () => {
    const { routes, sources } = setup({ github: err({ code: "UPSTREAM" }) });

    const reply = await register(routes, { githubLogin: "octocat" });

    expect(reply).toEqual({ status: 502, body: { error: "upstream_unavailable" } });
    expect(sources).toEqual([]);
  });
});
