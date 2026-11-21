import { describe, expect, it } from "vitest";
import { CURRENT_PROFILE_SCHEMA_VERSION, parseProfileCard } from "./index.ts";

type CardInput = Record<string, unknown>;

function validCard(overrides: CardInput = {}): CardInput {
  return {
    schemaVersion: 1,
    about: "Veterinarian studying livestock outbreaks.",
    technical: "uses",
    domains: [{ name: "veterinary epidemiology", depth: "expert" }],
    offers: ["contagion models"],
    seeks: ["someone to automate my analyses"],
    links: {},
    ...overrides,
  };
}

function issuePaths(value: unknown): string[] {
  const result = parseProfileCard(value);
  return result.ok ? [] : result.error.map((issue) => issue.path);
}

function isAccepted(card: CardInput): boolean {
  return parseProfileCard(card).ok;
}

describe("parseProfileCard valid cards", () => {
  it("accepts a minimal card with empty lists and no links", () => {
    const card = validCard({ domains: [], offers: [], seeks: [], links: {} });

    const result = parseProfileCard(card);

    expect(result).toEqual({ ok: true, value: card });
  });

  it("accepts a full card", () => {
    const card = validCard({
      technical: "codes",
      domains: [
        { name: "statistics", depth: "practitioner" },
        { name: "graph theory", depth: "curious" },
      ],
      offers: ["simulation", "Python"],
      seeks: ["field data", "domain experts"],
      links: {
        linkedin: "https://linkedin.com/in/someone",
        github: "https://github.com/someone",
        website: "https://example.com",
      },
    });

    const result = parseProfileCard(card);

    expect(result).toEqual({ ok: true, value: card });
  });

  it.each(["uses", "builds", "codes"])("accepts technical level %s", (technical) => {
    const card = validCard({ technical });

    const accepted = isAccepted(card);

    expect(accepted).toBe(true);
  });

  it.each(["curious", "practitioner", "expert"])("accepts domain depth %s", (depth) => {
    const card = validCard({ domains: [{ name: "math", depth }] });

    const accepted = isAccepted(card);

    expect(accepted).toBe(true);
  });

  it("exposes the current schema version as 1", () => {
    const version = CURRENT_PROFILE_SCHEMA_VERSION;

    expect(version).toBe(1);
  });

  it("parses a card built with the current schema version", () => {
    const card = validCard({ schemaVersion: CURRENT_PROFILE_SCHEMA_VERSION });

    const accepted = isAccepted(card);

    expect(accepted).toBe(true);
  });

  it("does not mutate its input", () => {
    const card = validCard({ links: { github: "https://github.com/someone" } });
    const copy = structuredClone(card);

    parseProfileCard(card);

    expect(card).toEqual(copy);
  });
});

describe("parseProfileCard schema version and shape", () => {
  it.each([
    ["null", null],
    ["a string", "profile"],
    ["an array", []],
  ])("returns an error for %s without throwing", (_name, value) => {
    const result = parseProfileCard(value);

    expect(result.ok).toBe(false);
  });

  it.each([
    ["null", null],
    ["a string", "profile"],
    ["an array", []],
  ])("reports /schemaVersion for %s", (_name, value) => {
    const paths = issuePaths(value);

    expect(paths).toContain("/schemaVersion");
  });

  it("reports a missing schemaVersion at /schemaVersion", () => {
    const card = validCard();
    delete card["schemaVersion"];

    const paths = issuePaths(card);

    expect(paths).toContain("/schemaVersion");
  });

  it.each([0, 2, "1"])("reports unsupported schemaVersion %j at /schemaVersion", (version) => {
    const card = validCard({ schemaVersion: version });

    const paths = issuePaths(card);

    expect(paths).toContain("/schemaVersion");
  });

  it("rejects an invalid technical level", () => {
    const card = validCard({ technical: "wizard" });

    const accepted = isAccepted(card);

    expect(accepted).toBe(false);
  });

  it("rejects an invalid domain depth", () => {
    const card = validCard({ domains: [{ name: "math", depth: "guru" }] });

    const accepted = isAccepted(card);

    expect(accepted).toBe(false);
  });
});

describe("parseProfileCard closed schema", () => {
  it("rejects an unknown top-level property", () => {
    const card = validCard({ cv: "full resume text" });

    const accepted = isAccepted(card);

    expect(accepted).toBe(false);
  });

  it("rejects an unknown property inside a domain", () => {
    const card = validCard({ domains: [{ name: "math", depth: "expert", years: 10 }] });

    const accepted = isAccepted(card);

    expect(accepted).toBe(false);
  });
});

describe("parseProfileCard limits", () => {
  it("accepts an about of 1000 characters", () => {
    const card = validCard({ about: "a".repeat(1000) });

    const accepted = isAccepted(card);

    expect(accepted).toBe(true);
  });

  it("rejects an about of 1001 characters", () => {
    const card = validCard({ about: "a".repeat(1001) });

    const accepted = isAccepted(card);

    expect(accepted).toBe(false);
  });

  it("rejects an empty about", () => {
    const card = validCard({ about: "" });

    const accepted = isAccepted(card);

    expect(accepted).toBe(false);
  });

  it("rejects a whitespace-only about", () => {
    const card = validCard({ about: "   " });

    const accepted = isAccepted(card);

    expect(accepted).toBe(false);
  });

  it("accepts 10 domains", () => {
    const domains = Array.from({ length: 10 }, (_, i) => ({
      name: `d${String(i)}`,
      depth: "curious",
    }));
    const card = validCard({ domains });

    const accepted = isAccepted(card);

    expect(accepted).toBe(true);
  });

  it("rejects 11 domains", () => {
    const domains = Array.from({ length: 11 }, (_, i) => ({
      name: `d${String(i)}`,
      depth: "curious",
    }));
    const card = validCard({ domains });

    const accepted = isAccepted(card);

    expect(accepted).toBe(false);
  });

  it("accepts a domain name of 80 characters", () => {
    const card = validCard({ domains: [{ name: "n".repeat(80), depth: "expert" }] });

    const accepted = isAccepted(card);

    expect(accepted).toBe(true);
  });

  it("rejects a domain name of 81 characters", () => {
    const card = validCard({ domains: [{ name: "n".repeat(81), depth: "expert" }] });

    const accepted = isAccepted(card);

    expect(accepted).toBe(false);
  });

  it("rejects an empty domain name", () => {
    const card = validCard({ domains: [{ name: "", depth: "expert" }] });

    const accepted = isAccepted(card);

    expect(accepted).toBe(false);
  });

  it("rejects a whitespace-only domain name", () => {
    const card = validCard({ domains: [{ name: "   ", depth: "expert" }] });

    const accepted = isAccepted(card);

    expect(accepted).toBe(false);
  });

  it.each(["offers", "seeks"])("accepts 10 %s", (field) => {
    const card = validCard({ [field]: Array.from({ length: 10 }, (_, i) => `item ${String(i)}`) });

    const accepted = isAccepted(card);

    expect(accepted).toBe(true);
  });

  it.each(["offers", "seeks"])("rejects 11 %s", (field) => {
    const card = validCard({ [field]: Array.from({ length: 11 }, (_, i) => `item ${String(i)}`) });

    const accepted = isAccepted(card);

    expect(accepted).toBe(false);
  });

  it.each(["offers", "seeks"])("accepts a %s entry of 200 characters", (field) => {
    const card = validCard({ [field]: ["x".repeat(200)] });

    const accepted = isAccepted(card);

    expect(accepted).toBe(true);
  });

  it.each(["offers", "seeks"])("rejects a %s entry of 201 characters", (field) => {
    const card = validCard({ [field]: ["x".repeat(201)] });

    const accepted = isAccepted(card);

    expect(accepted).toBe(false);
  });

  it.each(["offers", "seeks"])("rejects an empty %s entry", (field) => {
    const card = validCard({ [field]: [""] });

    const accepted = isAccepted(card);

    expect(accepted).toBe(false);
  });

  it.each(["offers", "seeks"])("rejects a whitespace-only %s entry", (field) => {
    const card = validCard({ [field]: ["   "] });

    const accepted = isAccepted(card);

    expect(accepted).toBe(false);
  });
});

describe("parseProfileCard links", () => {
  it.each(["linkedin", "github", "website"])("accepts an https %s link", (key) => {
    const card = validCard({ links: { [key]: "https://example.com/me" } });

    const accepted = isAccepted(card);

    expect(accepted).toBe(true);
  });

  it.each(["linkedin", "github", "website"])("rejects an http %s link", (key) => {
    const card = validCard({ links: { [key]: "http://example.com/me" } });

    const accepted = isAccepted(card);

    expect(accepted).toBe(false);
  });

  it.each(["linkedin", "github", "website"])("rejects a javascript %s link", (key) => {
    const card = validCard({ links: { [key]: "javascript:alert(1)" } });

    const accepted = isAccepted(card);

    expect(accepted).toBe(false);
  });

  it("accepts a link of 300 characters", () => {
    const link = "https://" + "a".repeat(300 - "https://".length);
    const card = validCard({ links: { website: link } });

    const accepted = isAccepted(card);

    expect(accepted).toBe(true);
  });

  it("rejects a link of 301 characters", () => {
    const link = "https://" + "a".repeat(301 - "https://".length);
    const card = validCard({ links: { website: link } });

    const accepted = isAccepted(card);

    expect(accepted).toBe(false);
  });
});
