import type { DomainDepth, ProfileCard, ProfileLinks, TechnicalLevel } from "@nodomics/profile";

export type DomainDraft = { readonly name: string; readonly depth: DomainDepth };

/** The editor's text fields: lists are one entry per line, links may be blank. */
export type CardDraft = {
  readonly about: string;
  readonly technical: TechnicalLevel;
  readonly domains: ReadonlyArray<DomainDraft>;
  readonly offers: string;
  readonly seeks: string;
  readonly linkedin: string;
  readonly github: string;
  readonly website: string;
};

const LINK_KEYS = ["linkedin", "github", "website"] as const;

export const EMPTY_DRAFT: CardDraft = {
  about: "",
  technical: "uses",
  domains: [],
  offers: "",
  seeks: "",
  linkedin: "",
  github: "",
  website: "",
};

export const NEW_DOMAIN: DomainDraft = { name: "", depth: "curious" };

export function draftOfCard(card: ProfileCard | undefined): CardDraft {
  if (card === undefined) return EMPTY_DRAFT;
  return {
    ...EMPTY_DRAFT,
    about: card.about,
    technical: card.technical,
    domains: card.domains,
    offers: card.offers.join("\n"),
    seeks: card.seeks.join("\n"),
    ...card.links,
  };
}

export function cardOfDraft(draft: CardDraft): ProfileCard {
  return {
    schemaVersion: 1,
    about: draft.about.trim(),
    technical: draft.technical,
    domains: draft.domains.filter(({ name }) => name.trim() !== "").map(trimDomain),
    offers: linesOf(draft.offers),
    seeks: linesOf(draft.seeks),
    links: linksOf(draft),
  };
}

const trimDomain = ({ name, depth }: DomainDraft): DomainDraft => ({ name: name.trim(), depth });

const linesOf = (text: string): string[] =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");

function linksOf(draft: CardDraft): ProfileLinks {
  return Object.fromEntries(
    LINK_KEYS.map((key) => [key, draft[key].trim()] as const).filter(([, url]) => url !== ""),
  );
}
