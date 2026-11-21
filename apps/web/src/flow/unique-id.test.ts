import { describe, expect, it } from "vitest";
import { createUniqueId, createUniqueIds, slugify } from "./unique-id.ts";

describe("createUniqueId", () => {
  it("keeps the base when it is free", () => {
    expect(createUniqueId("filter", new Set(["sort"]))).toBe("filter");
  });

  it("adds the first free numeric suffix", () => {
    expect(createUniqueId("filter", new Set(["filter", "filter-2"]))).toBe("filter-3");
  });
});

describe("createUniqueIds", () => {
  it("returns distinct ids that avoid the taken ones", () => {
    expect(createUniqueIds("edge", 3, new Set(["edge"]))).toEqual(["edge-2", "edge-3", "edge-4"]);
  });
});

describe("slugify", () => {
  it("turns free text into a protocol-safe id fragment", () => {
    expect(slugify("Limpieza de Años  2025!", "nodo")).toBe("limpieza-de-anos-2025");
  });

  it("falls back when nothing usable remains", () => {
    expect(slugify("¿¡!?", "nodo")).toBe("nodo");
  });
});
