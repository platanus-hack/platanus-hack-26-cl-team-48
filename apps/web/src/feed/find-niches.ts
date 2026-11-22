import type { FeedMapPerson } from "@nodomics/profile";
import { clusterVectors } from "./cluster-vectors.ts";

export const MAX_NICHES = 6;
const MAX_KEYWORDS = 3;
const MIN_WORD_LENGTH = 3;
const FALLBACK_LABEL = "Nicho";

export type Niche = {
  readonly id: string;
  readonly label: string;
  readonly keywords: readonly string[];
  readonly handles: readonly string[];
};

const STOPWORDS: ReadonlySet<string> = new Set(
  (
    "para con por los las del una uno unos unas que como mas más sus entre sobre desde hasta " +
    "sin muy todo toda todos todas este esta estos estas ese esa eso the and for with from your"
  ).split(" "),
);

const wordsOf = (offer: string) =>
  offer
    .toLocaleLowerCase("es")
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length >= MIN_WORD_LENGTH && !STOPWORDS.has(word));

/** The distinct meaningful words a person offers. */
const personWords = (person: FeedMapPerson) => new Set(person.offers.flatMap(wordsOf));

function tally(words: readonly string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const word of words) counts.set(word, (counts.get(word) ?? 0) + 1);
  return counts;
}

/** How many members offer each word. */
const countWords = (people: readonly FeedMapPerson[]) =>
  tally(people.flatMap((person) => [...personWords(person)]));

/** Words shared inside a niche, favouring the ones other niches do not use. */
function keywordsOf(counts: Map<string, number>, nichesUsing: Map<string, number>, total: number) {
  const score = (word: string, count: number) =>
    count * Math.log(1 + total / (nichesUsing.get(word) ?? 1));
  return [...counts]
    .map(([word, count]) => ({ word, score: score(word, count) }))
    .sort((a, b) => b.score - a.score || a.word.localeCompare(b.word))
    .slice(0, MAX_KEYWORDS)
    .map(({ word }) => word);
}

const capitalized = (word: string) => word.charAt(0).toLocaleUpperCase("es") + word.slice(1);

function groupPeople(people: readonly FeedMapPerson[]): FeedMapPerson[][] {
  const groups = clusterVectors(
    people.map(({ vector }) => vector),
    MAX_NICHES,
  );
  return [...new Set(groups)]
    .map((group) => people.filter((_, index) => groups[index] === group))
    .sort((a, b) => b.length - a.length);
}

/** The niches of the map: people grouped by what they offer, each named by its shared words. */
export function findNiches(people: readonly FeedMapPerson[]): readonly Niche[] {
  const groups = groupPeople(people);
  const counts = groups.map(countWords);
  const nichesUsing = tally(counts.flatMap((words) => [...words.keys()]));
  return groups.map((members, index) => {
    const keywords = keywordsOf(
      counts[index] ?? new Map<string, number>(),
      nichesUsing,
      groups.length,
    );
    return {
      id: `niche-${String(index)}`,
      label:
        keywords[0] === undefined
          ? `${FALLBACK_LABEL} ${String(index + 1)}`
          : capitalized(keywords[0]),
      keywords,
      handles: members.map(({ handle }) => handle),
    };
  });
}
