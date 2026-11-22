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
    LINK_KEYS.flatMap((key) => {
      const link = checkLink(draft[key]);
      return link.kind === "valid" ? [[key, link.url] as const] : [];
    }),
  );
}

export type LinkCheck =
  | { readonly kind: "empty" }
  | { readonly kind: "invalid" }
  | { readonly kind: "valid"; readonly url: string };

const ANY_SCHEME = /^[a-z][a-z\d+.-]*:\/\//i;
const HTTP_SCHEME = /^http:\/\//i;
const HTTPS_SCHEME = "https://";
const WHITESPACE = /\s/;

/**
 * People type "github.com/ana" or "http://…"; the card only takes https addresses (ADR 0022),
 * so a link gets https and must then be a web address with a dotted host.
 */
export function checkLink(text: string): LinkCheck {
  const typed = text.trim();
  if (typed === "") return { kind: "empty" };
  const url = withHttps(typed);
  return isWebAddress(url) ? { kind: "valid", url } : { kind: "invalid" };
}

export const hasInvalidLinks = (draft: CardDraft): boolean =>
  LINK_KEYS.some((key) => checkLink(draft[key]).kind === "invalid");

const withHttps = (url: string): string => {
  if (HTTP_SCHEME.test(url)) return url.replace(HTTP_SCHEME, HTTPS_SCHEME);
  return ANY_SCHEME.test(url) ? url : `${HTTPS_SCHEME}${url}`;
};

const isWebAddress = (url: string): boolean =>
  url.startsWith(HTTPS_SCHEME) &&
  !WHITESPACE.test(url) &&
  URL.canParse(url) &&
  new URL(url).hostname.includes(".");
