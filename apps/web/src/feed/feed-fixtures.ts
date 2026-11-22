import type { FeedHit, ProfileCard } from "@nodomics/profile";
import { ok } from "@nodomics/protocol";
import { vi } from "vitest";
import type { FeedService } from "./feed-service.ts";

export const ANA_CARD: ProfileCard = {
  schemaVersion: 1,
  about: "Veterinaria que estudia brotes en ganado.",
  technical: "builds",
  domains: [
    { name: "epidemiología veterinaria", depth: "expert" },
    { name: "estadística", depth: "practitioner" },
    { name: "teoría de grafos", depth: "curious" },
  ],
  offers: ["modelos de contagio", "análisis de datos"],
  seeks: ["alguien que automatice mis análisis", "datos de campo"],
  links: {
    linkedin: "https://linkedin.com/in/ana",
    github: "https://github.com/ana",
    website: "https://ana.example.com",
  },
};

export const BETO_CARD: ProfileCard = {
  schemaVersion: 1,
  about: "Ingeniero de datos con foco en clima.",
  technical: "codes",
  domains: [{ name: "meteorología", depth: "practitioner" }],
  offers: ["pipelines de datos"],
  seeks: ["expertos en agricultura"],
  links: {},
};

export const MINIMAL_CARD: ProfileCard = {
  schemaVersion: 1,
  about: "Solo lo básico.",
  technical: "uses",
  domains: [],
  offers: [],
  seeks: [],
  links: {},
};

export function profileHit(handle: string, title: string, card: ProfileCard = BETO_CARD): FeedHit {
  return { kind: "profile", id: handle, title, payload: card, similarity: 0.9 };
}

export function componentHit(kind: "node" | "flow", id: string, title: string): FeedHit {
  return { kind, id, title, payload: {}, similarity: 0.8 };
}

/** A hand-written fake: every operation succeeds with an empty result unless overridden; each override runs inside the spy the result exposes. */
export function createFakeFeed(overrides: Partial<FeedService> = {}) {
  const search = vi.fn<FeedService["search"]>(overrides.search ?? (() => Promise.resolve(ok([]))));
  const matches = vi.fn<FeedService["matches"]>(
    overrides.matches ?? (() => Promise.resolve(ok([]))),
  );
  const card = vi.fn<FeedService["card"]>(overrides.card ?? (() => Promise.resolve(ok(undefined))));
  const saveProfile = vi.fn<FeedService["saveProfile"]>(
    overrides.saveProfile ?? (() => Promise.resolve(ok(MINIMAL_CARD))),
  );
  const extractProfile = vi.fn<FeedService["extractProfile"]>(
    overrides.extractProfile ?? (() => Promise.resolve(ok(MINIMAL_CARD))),
  );
  const feed: FeedService = { search, matches, card, saveProfile, extractProfile };
  return { feed, search, matches, card, saveProfile, extractProfile };
}
