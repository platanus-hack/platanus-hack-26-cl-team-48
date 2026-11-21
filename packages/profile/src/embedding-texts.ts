import type { ProfileCard, ProfileDomain } from "./profile-card.ts";

export type ProfileEmbeddingTexts = {
  readonly offers: string;
  readonly seeks: string | undefined;
};

const LINE_SEPARATOR = "\n";

const domainLine = ({ name, depth }: ProfileDomain): string => `${name} (${depth})`;

/** The two texts to embed (ADR 0022 §3). Links never take part. */
export function profileToEmbeddingTexts(card: ProfileCard): ProfileEmbeddingTexts {
  const offers = [card.about, ...card.domains.map(domainLine), ...card.offers];
  return {
    offers: offers.join(LINE_SEPARATOR),
    seeks: card.seeks.length === 0 ? undefined : card.seeks.join(LINE_SEPARATOR),
  };
}
