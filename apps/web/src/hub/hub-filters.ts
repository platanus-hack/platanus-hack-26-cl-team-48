import type { PublicationKind, PublicationSummary } from "@nodomics/hub";

export const ALL_KINDS = "all";
export type KindFilter = PublicationKind | typeof ALL_KINDS;
export type HubView = "for-you" | "recent" | "flows" | "mine" | "map";
export const HUB_VIEWS: readonly HubView[] = ["for-you", "recent", "flows", "mine"];
/** "Mis flujos" and "Mis publicaciones" need an account. */
const ACCOUNT_VIEWS: ReadonlySet<HubView> = new Set(["flows", "mine"]);
export const PUBLIC_VIEWS: readonly HubView[] = HUB_VIEWS.filter(
  (view) => !ACCOUNT_VIEWS.has(view),
);
/** The views of the side column; "Mis flujos" is a tab of its own. */
export const BROWSE_VIEWS: readonly HubView[] = ["for-you", "recent", "mine", "map"];
export const isAccountView = (view: HubView) => ACCOUNT_VIEWS.has(view);

type Publications = ReadonlyArray<PublicationSummary>;

/** The distinct tags of the listed publications, in alphabetical order. */
export const tagsOf = (publications: Publications): string[] =>
  [...new Set(publications.flatMap((publication) => publication.tags))].sort((a, b) =>
    a.localeCompare(b),
  );

/** The tags to offer: those of the listed publications, plus the pressed ones so they can be lifted. */
export const offeredTags = (publications: Publications, pressed: ReadonlySet<string>): string[] =>
  tagsOf(publications)
    .concat([...pressed])
    .filter(isFirst)
    .sort(byText);

const isFirst = (tag: string, index: number, tags: ReadonlyArray<string>) =>
  tags.indexOf(tag) === index;

const byText = (a: string, b: string) => a.localeCompare(b);

/** Keeps the publications that carry every pressed tag. */
export const withTags = (publications: Publications, pressed: ReadonlySet<string>): Publications =>
  publications.filter((publication) => [...pressed].every((tag) => publication.tags.includes(tag)));

/** The hub's search (title, description, tags, owner), done here over the user's publications. */
export const matching = (
  publications: Publications,
  { text, kind }: { readonly text: string; readonly kind: KindFilter },
): Publications =>
  publications.filter(
    (publication) =>
      (kind === ALL_KINDS || publication.kind === kind) && containsText(publication, text),
  );

const containsText = (publication: PublicationSummary, text: string) => {
  const needle = normalize(text.trim());
  return [
    publication.title,
    publication.description,
    ...publication.tags,
    publication.owner.handle,
  ].some((field) => normalize(field).includes(needle));
};

// The same folding as the hub's own search, so "region" finds "región".
export const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

/** Pressing a tag again lifts its filter. */
export const toggled = (pressed: ReadonlySet<string>, tag: string): ReadonlySet<string> => {
  const next = new Set(pressed);
  if (!next.delete(tag)) next.add(tag);
  return next;
};
