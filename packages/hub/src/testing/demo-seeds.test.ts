import { parseProfileCard } from "@nodomics/profile";
import { describe, expect, it } from "vitest";
import { createMemoryHub } from "../memory-hub.ts";
import { parseSnapshot } from "../snapshot.ts";
import {
  DEMO_FEED_HITS,
  DEMO_INITIAL_DRAFTS,
  DEMO_PROFILE_CARDS,
  DEMO_PROFILES,
  DRAFT_AGRO_APP,
  DRAFT_AGRO_MODULE,
  DRAFT_AGRO_NODE,
  DRAFT_EDU_APP,
  DRAFT_EDU_MODULE,
  DRAFT_EDU_NODE,
  DRAFT_FINANCE_APP,
  DRAFT_FINANCE_MODULE,
  DRAFT_FINANCE_NODE,
  DRAFT_GLOBAL_AI_AUDIT,
  DRAFT_GLOBAL_BIOMECHANICS,
  DRAFT_GLOBAL_DRAINAGE,
  DRAFT_GLOBAL_DRILLING,
  DRAFT_GLOBAL_HEATMAP,
  DRAFT_GLOBAL_RESOURCES,
  DRAFT_HEALTH_APP,
  DRAFT_HEALTH_MODULE,
  DRAFT_HEALTH_NODE,
  DRAFT_HILO_ASISTENCIA,
  DRAFT_HILO_BODEGA,
  DRAFT_HILO_CENSO,
  DRAFT_HILO_CHURN,
  DRAFT_HILO_CRONICOS,
  DRAFT_HILO_QPCR,
  DRAFT_PUBLIC_APP,
  DRAFT_PUBLIC_MODULE,
  DRAFT_PUBLIC_NODE,
  DRAFT_PYMES_APP,
  DRAFT_PYMES_MODULE,
  DRAFT_PYMES_NODE,
  HILO_CASES_CATALOG,
  populateMemoryHub,
  THREAD_CONNECTION_STATES,
} from "./demo-seeds.ts";

describe("Demo Seeds & Fixtures", () => {
  it("defines valid profile cards complying with ProfileCardSchema", () => {
    expect(DEMO_PROFILES.length).toBeGreaterThanOrEqual(18);

    for (const profile of DEMO_PROFILES) {
      const card = DEMO_PROFILE_CARDS[profile.handle];
      expect(card, `Card missing for handle ${profile.handle}`).toBeDefined();
      if (card === undefined) continue;

      const parsed = parseProfileCard(card);
      expect(parsed.ok, `Card for ${profile.handle} failed schema: ${parsed.ok ? "" : JSON.stringify(parsed.error)}`).toBe(true);
    }
  });

  it("defines valid snapshots that parse without errors", () => {
    for (const { draft } of DEMO_INITIAL_DRAFTS) {
      const parsed = parseSnapshot(draft.snapshot);
      expect(parsed.ok, `Snapshot in ${draft.slug} failed parseSnapshot: ${parsed.ok ? "" : JSON.stringify(parsed.error)}`).toBe(true);
    }
  });

  it("includes all 6 primary core areas with App, Module and Node levels", () => {
    const slugs = new Set(DEMO_INITIAL_DRAFTS.map(({ draft }) => draft.slug));

    // 1. Agronomía
    expect(slugs.has(DRAFT_AGRO_APP.slug)).toBe(true);
    expect(slugs.has(DRAFT_AGRO_MODULE.slug)).toBe(true);
    expect(slugs.has(DRAFT_AGRO_NODE.slug)).toBe(true);
    expect(DRAFT_AGRO_APP.kind).toBe("app");
    expect(DRAFT_AGRO_MODULE.kind).toBe("flow");
    expect(DRAFT_AGRO_NODE.kind).toBe("node");

    // 2. Salud
    expect(slugs.has(DRAFT_HEALTH_APP.slug)).toBe(true);
    expect(slugs.has(DRAFT_HEALTH_MODULE.slug)).toBe(true);
    expect(slugs.has(DRAFT_HEALTH_NODE.slug)).toBe(true);
    expect(DRAFT_HEALTH_APP.kind).toBe("app");
    expect(DRAFT_HEALTH_MODULE.kind).toBe("flow");
    expect(DRAFT_HEALTH_NODE.kind).toBe("node");

    // 3. Educación
    expect(slugs.has(DRAFT_EDU_APP.slug)).toBe(true);
    expect(slugs.has(DRAFT_EDU_MODULE.slug)).toBe(true);
    expect(slugs.has(DRAFT_EDU_NODE.slug)).toBe(true);
    expect(DRAFT_EDU_APP.kind).toBe("app");
    expect(DRAFT_EDU_MODULE.kind).toBe("flow");
    expect(DRAFT_EDU_NODE.kind).toBe("node");

    // 4. Ventas & Pymes
    expect(slugs.has(DRAFT_PYMES_APP.slug)).toBe(true);
    expect(slugs.has(DRAFT_PYMES_MODULE.slug)).toBe(true);
    expect(slugs.has(DRAFT_PYMES_NODE.slug)).toBe(true);
    expect(DRAFT_PYMES_APP.kind).toBe("app");
    expect(DRAFT_PYMES_MODULE.kind).toBe("flow");
    expect(DRAFT_PYMES_NODE.kind).toBe("node");

    // 5. Datos Públicos
    expect(slugs.has(DRAFT_PUBLIC_APP.slug)).toBe(true);
    expect(slugs.has(DRAFT_PUBLIC_MODULE.slug)).toBe(true);
    expect(slugs.has(DRAFT_PUBLIC_NODE.slug)).toBe(true);
    expect(DRAFT_PUBLIC_APP.kind).toBe("app");
    expect(DRAFT_PUBLIC_MODULE.kind).toBe("flow");
    expect(DRAFT_PUBLIC_NODE.kind).toBe("node");

    // 6. Finanzas
    expect(slugs.has(DRAFT_FINANCE_APP.slug)).toBe(true);
    expect(slugs.has(DRAFT_FINANCE_MODULE.slug)).toBe(true);
    expect(slugs.has(DRAFT_FINANCE_NODE.slug)).toBe(true);
    expect(DRAFT_FINANCE_APP.kind).toBe("app");
    expect(DRAFT_FINANCE_MODULE.kind).toBe("flow");
    expect(DRAFT_FINANCE_NODE.kind).toBe("node");
  });

  it("includes the 6 specific Hilo cases from VOCABULARIO-HILO.md with badges and connection states", () => {
    expect(HILO_CASES_CATALOG).toHaveLength(6);

    const [c1, c2, c3, c4, c5, c6] = HILO_CASES_CATALOG;

    // 1. Salud: Controles crónicos atrasados
    expect(c1).toMatchObject({
      slug: DRAFT_HILO_CRONICOS.slug,
      threadState: "Se trenza",
      validationBadge: "Probada con 214 fichas",
      adaptationsCount: 2,
    });

    // 2. Datos públicos: Limpieza del censo comunal
    expect(c2).toMatchObject({
      slug: DRAFT_HILO_CENSO.slug,
      threadState: "Se empalma",
      validationBadge: "Reparada y probada de nuevo",
      adaptationsCount: 4,
    });

    // 3. Educación: Asistencia escolar por curso
    expect(c3).toMatchObject({
      slug: DRAFT_HILO_ASISTENCIA.slug,
      threadState: "Se trenza",
      validationBadge: "Probada en 6 colegios",
      adaptationsCount: 3,
    });

    // 4. Ventas: Churn mensual de suscriptores
    expect(c4).toMatchObject({
      slug: DRAFT_HILO_CHURN.slug,
      threadState: "Se enreda",
      validationBadge: "Propuesta del agente sin revisar",
      adaptationsCount: 1,
    });

    // 5. Ventas: Quiebres de stock en bodega
    expect(c5).toMatchObject({
      slug: DRAFT_HILO_BODEGA.slug,
      threadState: "Se triza",
      validationBadge: "Falló con los datos de otra bodega",
      adaptationsCount: 1,
    });

    // 6. Laboratorio: Normalización de qPCR
    expect(c6).toMatchObject({
      slug: DRAFT_HILO_QPCR.slug,
      threadState: "Sin adaptar",
      validationBadge: "Sin probar fuera de su laboratorio",
      adaptationsCount: 0,
    });
  });

  it("contains the full 6 thread connection state definitions", () => {
    expect(Object.keys(THREAD_CONNECTION_STATES)).toEqual([
      "Se cruza",
      "Se trenza",
      "Se enreda",
      "Se desenreda",
      "Se triza",
      "Se empalma",
    ]);
  });

  it("populates an in-memory hub and allows discovery and search", async () => {
    let nowMinute = 0;
    const hub = createMemoryHub({
      profiles: DEMO_PROFILES,
      now: () => {
        nowMinute += 1;
        return new Date(Date.UTC(2026, 10, 20, 12, nowMinute)).toISOString();
      },
    });

    await populateMemoryHub(hub);

    // Search all
    const allResults = await hub.search({});
    expect(allResults.ok).toBe(true);
    if (!allResults.ok) return;
    expect(allResults.value.length).toBe(DEMO_INITIAL_DRAFTS.length);

    // Search by keyword "berries"
    const berrySearch = await hub.search({ text: "berries" });
    expect(berrySearch.ok).toBe(true);
    if (berrySearch.ok) {
      expect(berrySearch.value.some((p) => p.slug === "cadena-frio-berries")).toBe(true);
    }

    // Search by keyword "sinca"
    const sincaSearch = await hub.search({ text: "sinca" });
    expect(sincaSearch.ok).toBe(true);
    if (sincaSearch.ok) {
      expect(sincaSearch.value.some((p) => p.slug === "observatorio-calidad-aire-sinca")).toBe(true);
    }

    // Search by kind "node"
    const nodesSearch = await hub.search({ kind: "node" });
    expect(nodesSearch.ok).toBe(true);
    if (nodesSearch.ok) {
      expect(nodesSearch.value.every((p) => p.kind === "node")).toBe(true);
      expect(nodesSearch.value.some((p) => p.slug === "filtro-sensores-resiliente")).toBe(true);
      expect(nodesSearch.value.some((p) => p.slug === "normalizacion-qpcr")).toBe(true);
    }

    // Publications of author
    const mateoPubs = await hub.publicationsOf("mateo_agrolab");
    expect(mateoPubs.ok).toBe(true);
    if (mateoPubs.ok) {
      expect(mateoPubs.value.length).toBe(3);
    }
  });

  it("provides FeedHits for profiles and components", () => {
    expect(DEMO_FEED_HITS.length).toBeGreaterThanOrEqual(20);
    expect(DEMO_FEED_HITS.filter((h) => h.kind === "profile").length).toBe(18);
    expect(DEMO_FEED_HITS.filter((h) => h.kind === "app").length).toBeGreaterThan(0);
    expect(DEMO_FEED_HITS.filter((h) => h.kind === "flow").length).toBeGreaterThan(0);
    expect(DEMO_FEED_HITS.filter((h) => h.kind === "node").length).toBeGreaterThan(0);
  });

  it("includes the 6 Global Domain Archetypes abstracted from hackathon tracks", () => {
    const slugs = new Set(DEMO_INITIAL_DRAFTS.map(({ draft }) => draft.slug));

    expect(slugs.has(DRAFT_GLOBAL_HEATMAP.slug)).toBe(true);
    expect(slugs.has(DRAFT_GLOBAL_DRILLING.slug)).toBe(true);
    expect(slugs.has(DRAFT_GLOBAL_BIOMECHANICS.slug)).toBe(true);
    expect(slugs.has(DRAFT_GLOBAL_RESOURCES.slug)).toBe(true);
    expect(slugs.has(DRAFT_GLOBAL_DRAINAGE.slug)).toBe(true);
    expect(slugs.has(DRAFT_GLOBAL_AI_AUDIT.slug)).toBe(true);

    // Verify all global archetypes are valid flow graphs with manifests
    for (const draft of [
      DRAFT_GLOBAL_HEATMAP,
      DRAFT_GLOBAL_DRILLING,
      DRAFT_GLOBAL_BIOMECHANICS,
      DRAFT_GLOBAL_RESOURCES,
      DRAFT_GLOBAL_DRAINAGE,
      DRAFT_GLOBAL_AI_AUDIT,
    ]) {
      expect(draft.kind).toBe("app");
      expect(draft.tags).toContain("global");
      expect(draft.flow).toBeDefined();
      expect(draft.flow?.nodes.length).toBeGreaterThanOrEqual(3);
      expect(draft.flow?.edges.length).toBeGreaterThanOrEqual(2);
    }
  });
});
