import { describe, expect, it } from "vitest";
import { hubNodeId, isValidSlug, slugOf } from "./hub-names.ts";

describe("slugOf", () => {
  it("lowercases a simple title", () => {
    const title = "Ventas";

    const slug = slugOf(title);

    expect(slug).toBe("ventas");
  });

  it("strips accents and diacritics", () => {
    const title = "Análisis de Población Ñandú";

    const slug = slugOf(title);

    expect(slug).toBe("analisis-de-poblacion-nandu");
  });

  it("collapses every run of other characters into a single hyphen", () => {
    const title = "ventas  --  2024 / Q1!!";

    const slug = slugOf(title);

    expect(slug).toBe("ventas-2024-q1");
  });

  it("never starts or ends with a hyphen", () => {
    const title = "  ¡Hola mundo!  ";

    const slug = slugOf(title);

    expect(slug).toBe("hola-mundo");
  });

  it("truncates to at most 30 characters", () => {
    const title = "a".repeat(45);

    const slug = slugOf(title);

    expect(slug).toBe("a".repeat(30));
  });

  it("trims a trailing hyphen left by truncation", () => {
    const title = `${"a".repeat(29)} bcd`;

    const slug = slugOf(title);

    expect(slug).toBe("a".repeat(29));
  });

  it("returns 'flujo' when nothing usable remains", () => {
    const titles = ["", "   ", "!!!", "——", "日本語"];

    const slugs = titles.map(slugOf);

    expect(slugs).toEqual(["flujo", "flujo", "flujo", "flujo", "flujo"]);
  });

  it("always produces a valid slug", () => {
    const titles = [
      "Mi flujo",
      "x".repeat(100),
      "--a--",
      "Ü",
      "",
      "a b c d e f g h i j k l m n o p",
    ];

    const slugs = titles.map(slugOf);

    expect(slugs.every(isValidSlug)).toBe(true);
  });
});

describe("isValidSlug", () => {
  it("accepts lowercase letters, digits and hyphens up to 30 characters", () => {
    const slugs = ["a", "ventas-2024", "a".repeat(30), "-"];

    const results = slugs.map(isValidSlug);

    expect(results).toEqual([true, true, true, true]);
  });

  it("rejects empty, too long, uppercase, accented, spaced or dotted slugs", () => {
    const slugs = ["", "a".repeat(31), "Ventas", "análisis", "mi flujo", "a.b", "a_b", "a/b"];

    const results = slugs.map(isValidSlug);

    expect(results).toEqual([false, false, false, false, false, false, false, false]);
  });
});

describe("hubNodeId", () => {
  it("joins the handle and slug under the hub prefix", () => {
    const handle = "ana";

    const id = hubNodeId(handle, "limpiar-ventas");

    expect(id).toBe("hub.ana.limpiar-ventas");
  });

  it("produces an id that satisfies the protocol Id pattern", () => {
    const handle = "a".repeat(20);

    const id = hubNodeId(handle, "b".repeat(30));

    expect(id).toMatch(/^[A-Za-z0-9_.-]{1,64}$/);
  });
});
