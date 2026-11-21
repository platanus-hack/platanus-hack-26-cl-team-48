import type { PublicationKind, PublicationSummary } from "@nodomics/hub";

export const ALL_KINDS = "all";
export type KindFilter = PublicationKind | typeof ALL_KINDS;
export type HubView = "for-you" | "recent" | "mine";
export const HUB_VIEWS: readonly HubView[] = ["for-you", "recent", "mine"];

type Publications = ReadonlyArray<PublicationSummary>;

/** The distinct tags of the listed publications, in alphabetical order. */
export const tagsOf = (publications: Publications): string[] =>
  [...new Set(publications.flatMap((publication) => publication.tags))].sort((a, b) =>
    a.localeCompare(b),
  );

/** Keeps the publications that carry every pressed tag. */
export const withTags = (publications: Publications, pressed: ReadonlySet<string>): Publications =>
  publications.filter((publication) => [...pressed].every((tag) => publication.tags.includes(tag)));

/** The search the hub does on the server, done here over the user's own publications. */
export const matching = (
  publications: Publications,
  { text, kind }: { readonly text: string; readonly kind: KindFilter },
): Publications =>
  publications.filter(
    (publication) =>
      (kind === ALL_KINDS || publication.kind === kind) && containsText(publication, text),
  );

const containsText = (publication: PublicationSummary, text: string) => {
  const needle = text.trim().toLocaleLowerCase();
  return [publication.title, publication.description].some((field) =>
    field.toLocaleLowerCase().includes(needle),
  );
};

/** Pressing a tag again lifts its filter. */
export const toggled = (pressed: ReadonlySet<string>, tag: string): ReadonlySet<string> => {
  const next = new Set(pressed);
  if (!next.delete(tag)) next.add(tag);
  return next;
};
