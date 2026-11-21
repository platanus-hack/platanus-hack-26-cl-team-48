import { describe, expect, it } from "vitest";
import { ANA_CARD, BETO_CARD, MINIMAL_CARD } from "./feed-fixtures.ts";
import { createMemoryFeedService } from "./memory-feed-service.ts";

const seed = (ownHandle?: string) => ({
  cards: { ana: ANA_CARD, beto: BETO_CARD },
  ...(ownHandle === undefined ? {} : { ownHandle }),
});

describe("createMemoryFeedService card", () => {
  it("returns the seeded card of a handle", async () => {
    const service = createMemoryFeedService(seed());

    const result = await service.card("ana");

    expect(result).toEqual({ ok: true, value: ANA_CARD });
  });

  it("returns an undefined card for an unknown handle", async () => {
    const service = createMemoryFeedService(seed());

    const result = await service.card("nadie");

    expect(result).toEqual({ ok: true, value: undefined });
  });
});

describe("createMemoryFeedService saveProfile", () => {
  it("stores a valid card under the own handle and returns it", async () => {
    const service = createMemoryFeedService(seed("carla"));

    const saved = await service.saveProfile(MINIMAL_CARD);
    const stored = await service.card("carla");

    expect({ saved, stored }).toEqual({
      saved: { ok: true, value: MINIMAL_CARD },
      stored: { ok: true, value: MINIMAL_CARD },
    });
  });

  it("returns INVALID_CARD with issues for an invalid card and stores nothing", async () => {
    const service = createMemoryFeedService(seed("carla"));

    const result = await service.saveProfile({ ...MINIMAL_CARD, about: "" });
    const stored = await service.card("carla");

    expect({
      code: !result.ok && result.error.code,
      hasIssues: !result.ok && (result.error.issues?.length ?? 0) > 0,
      stored,
    }).toEqual({ code: "INVALID_CARD", hasIssues: true, stored: { ok: true, value: undefined } });
  });

  it("returns UNAUTHENTICATED when there is no own handle", async () => {
    const service = createMemoryFeedService(seed());

    const result = await service.saveProfile(MINIMAL_CARD);

    expect(result).toEqual({ ok: false, error: { code: "UNAUTHENTICATED" } });
  });
});

describe("createMemoryFeedService search", () => {
  it("returns profile hits whose card text contains the query, ignoring case", async () => {
    const service = createMemoryFeedService(seed());

    const result = await service.search("GANADO");

    expect(result.ok && result.value.map((hit) => [hit.kind, hit.id])).toEqual([
      ["profile", "ana"],
    ]);
  });

  it("returns no hits when nothing matches", async () => {
    const service = createMemoryFeedService(seed());

    const result = await service.search("astrofísica");

    expect(result).toEqual({ ok: true, value: [] });
  });
});

describe("createMemoryFeedService matches", () => {
  it("returns NO_PROFILE when the own card is missing", async () => {
    const service = createMemoryFeedService(seed("carla"));

    const result = await service.matches();

    expect(result).toEqual({ ok: false, error: { code: "NO_PROFILE" } });
  });

  it("returns every other profile as a hit when the own card exists", async () => {
    const service = createMemoryFeedService(seed("ana"));

    const result = await service.matches();

    expect(result.ok && result.value.map((hit) => [hit.kind, hit.id])).toEqual([
      ["profile", "beto"],
    ]);
  });
});

describe("createMemoryFeedService extractProfile", () => {
  it("returns UNAVAILABLE", async () => {
    const service = createMemoryFeedService(seed("ana"));

    const result = await service.extractProfile({ text: "cv" });

    expect(result).toEqual({ ok: false, error: { code: "UNAVAILABLE" } });
  });
});

describe("createMemoryFeedService with a current handle", () => {
  const sessionSeed = (handle: string | undefined) => ({
    cards: { beto: BETO_CARD },
    currentHandle: () => Promise.resolve(handle),
  });

  it("stores a saved card under the current handle", async () => {
    const service = createMemoryFeedService(sessionSeed("ana"));

    const saved = await service.saveProfile(MINIMAL_CARD);
    const stored = await service.card("ana");

    expect({ saved, stored }).toEqual({
      saved: { ok: true, value: MINIMAL_CARD },
      stored: { ok: true, value: MINIMAL_CARD },
    });
  });

  it("returns the other profiles from matches after saving", async () => {
    const service = createMemoryFeedService(sessionSeed("ana"));
    await service.saveProfile(MINIMAL_CARD);

    const result = await service.matches();

    expect(result.ok && result.value.map((hit) => [hit.kind, hit.id])).toEqual([
      ["profile", "beto"],
    ]);
  });

  it("returns UNAUTHENTICATED from saveProfile when nobody is signed in", async () => {
    const service = createMemoryFeedService(sessionSeed(undefined));

    const result = await service.saveProfile(MINIMAL_CARD);

    expect(result).toEqual({ ok: false, error: { code: "UNAUTHENTICATED" } });
  });

  it("returns UNAUTHENTICATED from matches when nobody is signed in", async () => {
    const service = createMemoryFeedService(sessionSeed(undefined));

    const result = await service.matches();

    expect(result).toEqual({ ok: false, error: { code: "UNAUTHENTICATED" } });
  });

  it("asks the current handle on each call", async () => {
    let handle: string | undefined = undefined;
    const service = createMemoryFeedService({
      cards: {},
      currentHandle: () => Promise.resolve(handle),
    });

    const before = await service.saveProfile(MINIMAL_CARD);
    handle = "carla";
    const after = await service.saveProfile(MINIMAL_CARD);

    expect({ before: before.ok, after: after.ok }).toEqual({ before: false, after: true });
  });
});
