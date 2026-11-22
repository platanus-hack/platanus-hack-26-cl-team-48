import { describe, expect, it } from "vitest";
import { profileToEmbeddingTexts, type ProfileCard } from "./index.ts";

function validCard(overrides: Partial<ProfileCard> = {}): ProfileCard {
  return {
    schemaVersion: 1,
    about: "Mathematician with solid theory background.",
    technical: "uses",
    domains: [
      { name: "numerical analysis", depth: "expert" },
      { name: "topology", depth: "practitioner" },
    ],
    offers: ["proofs of convergence", "statistical modelling"],
    seeks: ["someone to implement my algorithms in Python", "GPU experience"],
    links: {},
    ...overrides,
  };
}

describe("profileToEmbeddingTexts offers", () => {
  it("includes the about text", () => {
    const card = validCard();

    const texts = profileToEmbeddingTexts(card);

    expect(texts.offers).toContain(card.about);
  });

  it("includes every domain name", () => {
    const card = validCard();

    const texts = profileToEmbeddingTexts(card);

    for (const domain of card.domains) {
      expect(texts.offers).toContain(domain.name);
    }
  });

  it("includes every offer", () => {
    const card = validCard();

    const texts = profileToEmbeddingTexts(card);

    for (const offer of card.offers) {
      expect(texts.offers).toContain(offer);
    }
  });
});

describe("profileToEmbeddingTexts seeks", () => {
  it("is undefined when the card has no seeks", () => {
    const card = validCard({ seeks: [] });

    const texts = profileToEmbeddingTexts(card);

    expect(texts.seeks).toBeUndefined();
  });

  it("includes every seek", () => {
    const card = validCard();

    const texts = profileToEmbeddingTexts(card);

    for (const seek of card.seeks) {
      expect(texts.seeks).toContain(seek);
    }
  });
});

describe("profileToEmbeddingTexts stability", () => {
  it("returns identical texts for the same card", () => {
    const card = validCard();

    const first = profileToEmbeddingTexts(card);
    const second = profileToEmbeddingTexts(structuredClone(card));

    expect(second).toEqual(first);
  });

  it("ignores links", () => {
    const withoutLinks = validCard({ links: {} });
    const withLinks = validCard({
      links: { github: "https://github.com/someone", website: "https://example.com" },
    });

    const texts = profileToEmbeddingTexts(withLinks);

    expect(texts).toEqual(profileToEmbeddingTexts(withoutLinks));
  });

  it("changes offers when an offer changes", () => {
    const original = validCard();
    const changed = validCard({ offers: ["something completely different"] });

    const before = profileToEmbeddingTexts(original);
    const after = profileToEmbeddingTexts(changed);

    expect(after.offers).not.toBe(before.offers);
  });

  it("keeps seeks unchanged when an offer changes", () => {
    const original = validCard();
    const changed = validCard({ offers: ["something completely different"] });

    const before = profileToEmbeddingTexts(original);
    const after = profileToEmbeddingTexts(changed);

    expect(after.seeks).toBe(before.seeks);
  });

  it("changes seeks when a seek changes", () => {
    const original = validCard();
    const changed = validCard({ seeks: ["something completely different"] });

    const before = profileToEmbeddingTexts(original);
    const after = profileToEmbeddingTexts(changed);

    expect(after.seeks).not.toBe(before.seeks);
  });

  it("keeps offers unchanged when a seek changes", () => {
    const original = validCard();
    const changed = validCard({ seeks: ["something completely different"] });

    const before = profileToEmbeddingTexts(original);
    const after = profileToEmbeddingTexts(changed);

    expect(after.offers).toBe(before.offers);
  });
});
