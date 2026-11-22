import type { DomainDepth, ProfileCard, ProfileLinks, TechnicalLevel } from "@nodomics/profile";

export type DomainDraft = { readonly name: string; readonly depth: DomainDepth };

/** The wizard's fields: lists hold one entry per chip, links may be blank. */
export type CardDraft = {
  readonly about: string;
  readonly technical: TechnicalLevel;
  readonly domains: ReadonlyArray<DomainDraft>;
  readonly offers: ReadonlyArray<string>;
  readonly seeks: ReadonlyArray<string>;
  readonly linkedin: string;
  readonly github: string;
  readonly website: string;
};

const LINK_KEYS = ["linkedin", "github", "website"] as const;

export const EMPTY_DRAFT: CardDraft = {
  about: "",
  technical: "uses",
  domains: [],
  offers: [],
  seeks: [],
  linkedin: "",
  github: "",
  website: "",
};

export function draftOfCard(card: ProfileCard | undefined): CardDraft {
  if (card === undefined) return EMPTY_DRAFT;
  return {
    ...EMPTY_DRAFT,
    about: card.about,
    technical: card.technical,
    domains: card.domains,
    offers: card.offers,
    seeks: card.seeks,
    ...card.links,
  };
}

export function cardOfDraft(draft: CardDraft): ProfileCard {
  return {
    schemaVersion: 1,
    about: draft.about.trim(),
    technical: draft.technical,
    domains: draft.domains.filter(({ name }) => name.trim() !== "").map(trimDomain),
    offers: entriesOf(draft.offers),
    seeks: entriesOf(draft.seeks),
    links: linksOf(draft),
  };
}

const trimDomain = ({ name, depth }: DomainDraft): DomainDraft => ({ name: name.trim(), depth });

const entriesOf = (entries: ReadonlyArray<string>): string[] =>
  entries.map((entry) => entry.trim()).filter((entry) => entry !== "");

function linksOf(draft: CardDraft): ProfileLinks {
  return Object.fromEntries(
    LINK_KEYS.map((key) => [key, draft[key].trim()] as const)
      .filter(([, url]) => url !== "")
      .map(([key, url]) => [key, withScheme(url)] as const),
  );
}

const URL_SCHEME = /^[a-z][a-z\d+.-]*:\/\//i;
const DEFAULT_SCHEME = "https://";

/** People type "github.com/ana"; the card stores a full address so the link opens. */
const withScheme = (url: string): string =>
  URL_SCHEME.test(url) ? url : `${DEFAULT_SCHEME}${url}`;
