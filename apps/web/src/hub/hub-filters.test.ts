import type { PublicationSummary } from "@nodomics/hub";
import { describe, expect, it } from "vitest";
import { ALL_KINDS, matching } from "./hub-filters.ts";

const summaryOf = (overrides: Partial<PublicationSummary>): PublicationSummary => ({
  id: "p-ventas",
  slug: "ventas",
  kind: "flow",
  title: "Ventas por región",
  description: "Suma las ventas de cada mes",
  tags: ["comercial"],
  license: "MIT",
  updatedAt: "2026-11-21T10:00:00.000Z",
  owner: { handle: "ana", displayName: "Ana Pérez" },
  ...overrides,
});

const VENTAS = summaryOf({});
const CLIMA = summaryOf({
  id: "p-clima",
  slug: "clima",
  title: "Clima diario",
  description: "Temperaturas de cada día",
  tags: ["meteorología"],
  owner: { handle: "beto", displayName: "Beto Ruiz" },
});
const LIMPIAR = summaryOf({
  id: "p-limpiar",
  slug: "limpiar",
  kind: "node",
  title: "Limpiar texto",
  description: "Quita espacios",
  tags: ["texto"],
});
const PUBLICATIONS = [VENTAS, CLIMA, LIMPIAR];

const titlesMatching = (text: string) =>
  matching(PUBLICATIONS, { text, kind: ALL_KINDS }).map(({ title }) => title);

describe("matching", () => {
  it("keeps the publications with a tag that contains the text", () => {
    const titles = titlesMatching("comercial");

    expect(titles).toEqual(["Ventas por región"]);
  });

  it("keeps the publications whose owner's handle contains the text", () => {
    const titles = titlesMatching("beto");

    expect(titles).toEqual(["Clima diario"]);
  });

  it("matches text without accents against a title with accents", () => {
    const titles = titlesMatching("region");

    expect(titles).toEqual(["Ventas por región"]);
  });

  it("matches text with accents against a title without them", () => {
    const titles = titlesMatching("límpiar");

    expect(titles).toEqual(["Limpiar texto"]);
  });

  it("matches a tag regardless of accents and case", () => {
    const titles = titlesMatching("METEOROLOGIA");

    expect(titles).toEqual(["Clima diario"]);
  });
});
