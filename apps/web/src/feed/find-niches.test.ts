import type { FeedMapPerson } from "@nodomics/profile";
import { describe, expect, it } from "vitest";
import { findNiches, MAX_NICHES } from "./find-niches.ts";

const STOPWORDS = ["de", "y", "la", "para", "con", "en"];

function person(handle: string, vector: number[], offers: string[] = []): FeedMapPerson {
  return { handle, title: handle, technical: "codes", offers, vector, match: false };
}

const DATA_GROUP = [
  person("ana", [1, 0.02, 0.01], ["pipelines de datos"]),
  person("beto", [0.98, 0.01, 0.03], ["limpieza de datos"]),
  person("carla", [0.99, 0.03, 0.02], ["datos abiertos"]),
];
const PHOTO_GROUP = [
  person("dani", [0.01, 1, 0.02], ["fotografía de producto"]),
  person("eli", [0.03, 0.97, 0.01], ["fotografía y video"]),
  person("fede", [0.02, 0.99, 0.03], ["retoque de fotografía"]),
];
const LAW_GROUP = [
  person("gabi", [0.02, 0.01, 1], ["contratos para startups"]),
  person("hugo", [0.01, 0.03, 0.98], ["revisión de contratos"]),
  person("ines", [0.03, 0.02, 0.99], ["contratos con proveedores"]),
];
const ALL = [...DATA_GROUP, ...PHOTO_GROUP, ...LAW_GROUP];
const DISTINCT_40 = Array.from({ length: 40 }, (_, i) => person(`p${String(i)}`, oneHot(i, 40)));

function oneHot(index: number, size: number): number[] {
  return Array.from({ length: size }, (_, i) => (i === index ? 1 : 0));
}

const handlesOf = (people: readonly FeedMapPerson[]) => people.map((p) => p.handle).sort();
const sortedNicheHandles = (people: readonly FeedMapPerson[]) =>
  findNiches(people)
    .map((niche) => [...niche.handles].sort())
    .sort((a, b) => (a[0] ?? "").localeCompare(b[0] ?? ""));

describe("findNiches", () => {
  it("returns no niches for no people", () => {
    const niches = findNiches([]);

    expect(niches).toEqual([]);
  });

  it("returns one niche with the only person", () => {
    const niches = findNiches([person("ana", [1, 0], ["datos"])]);

    expect(niches.map((niche) => niche.handles)).toEqual([["ana"]]);
  });

  it("places every handle in exactly one niche", () => {
    const niches = findNiches(ALL);

    expect(niches.flatMap((niche) => niche.handles).sort()).toEqual(handlesOf(ALL));
  });

  it("groups people with similar vectors into the same niche", () => {
    const groups = sortedNicheHandles(ALL);

    expect(groups).toEqual([handlesOf(DATA_GROUP), handlesOf(PHOTO_GROUP), handlesOf(LAW_GROUP)]);
  });

  it("gives every niche a unique id", () => {
    const niches = findNiches(ALL);

    expect(new Set(niches.map((niche) => niche.id)).size).toBe(niches.length);
  });

  it("never returns more than the maximum number of niches", () => {
    const niches = findNiches(DISTINCT_40);

    expect(niches.length).toBeLessThanOrEqual(MAX_NICHES);
  });

  it("still places every handle in exactly one niche when niches are capped", () => {
    const niches = findNiches(DISTINCT_40);

    expect(niches.flatMap((niche) => niche.handles).sort()).toEqual(handlesOf(DISTINCT_40));
  });

  it("sorts niches by member count, largest first", () => {
    const people = [...PHOTO_GROUP.slice(0, 1), ...LAW_GROUP.slice(0, 2), ...DATA_GROUP];

    const sizes = findNiches(people).map((niche) => niche.handles.length);

    expect(sizes).toEqual([3, 2, 1]);
  });

  it("keeps niches sorted by size when they are capped", () => {
    const sizes = findNiches(DISTINCT_40).map((niche) => niche.handles.length);

    expect(sizes).toEqual([...sizes].sort((a, b) => b - a));
  });

  it("uses the most frequent offer word as the first keyword", () => {
    const [niche] = findNiches(DATA_GROUP);

    expect(niche?.keywords[0]).toBe("datos");
  });

  it("keeps at most three keywords", () => {
    const [niche] = findNiches(DATA_GROUP);

    expect(niche?.keywords.length).toBeLessThanOrEqual(3);
  });

  it("ignores stopwords and short words in keywords", () => {
    const people = [
      person("ana", [1, 0], ["mapas de la ciudad y en red"]),
      person("beto", [0.99, 0.01], ["mapas para ONG con QR"]),
      person("carla", [0.98, 0.02], ["mapas de la región"]),
    ];

    const keywords = findNiches(people)[0]?.keywords ?? [];

    expect({
      first: keywords[0],
      stopwords: keywords.filter((word) => STOPWORDS.includes(word)),
      short: keywords.filter((word) => word.length < 3),
    }).toEqual({ first: "mapas", stopwords: [], short: [] });
  });

  it("writes keywords in lowercase", () => {
    const people = [
      person("ana", [1, 0], ["Datos Abiertos"]),
      person("beto", [0.99, 0.01], ["DATOS de clima"]),
    ];

    const keywords = findNiches(people)[0]?.keywords ?? [];

    expect(keywords.filter((word) => word !== word.toLowerCase())).toEqual([]);
  });

  it("starts the label with the first keyword capitalized", () => {
    const [niche] = findNiches(DATA_GROUP);

    expect(niche?.label.startsWith("Datos")).toBe(true);
  });

  it("gives a non-empty label to a niche without offers", () => {
    const [niche] = findNiches([person("ana", [1, 0]), person("beto", [0.99, 0.01])]);

    expect({ hasLabel: (niche?.label.trim().length ?? 0) > 0, keywords: niche?.keywords }).toEqual({
      hasLabel: true,
      keywords: [],
    });
  });

  it("returns the same niches for the same people", () => {
    const first = findNiches(ALL);

    const second = findNiches(ALL);

    expect(second).toEqual(first);
  });
});
