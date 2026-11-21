import type { Episode } from "./memory-port.ts";

export type CitedAnswer = {
  readonly answer: string;
  readonly citations: readonly string[];
};

export const NO_BACKED_ANSWER = "No encontré historial que respalde una respuesta.";

const SENTENCE_BREAK = /(?<=[.!?])\s+/;
const CITATION = /\[([^\]]+)\]/g;

const citedIds = (sentence: string): readonly string[] =>
  Array.from(sentence.matchAll(CITATION), (match) => match[1] ?? "");

const isBacked = (sentence: string, known: ReadonlySet<string>): boolean => {
  const ids = citedIds(sentence);
  return ids.length > 0 && ids.every((id) => known.has(id));
};

/** Every sentence must cite at least one real episode; the rest are dropped. */
export function keepCitedSentences(text: string, episodes: readonly Episode[]): CitedAnswer {
  const known = new Set(episodes.map((episode) => episode.id));
  const kept = text
    .split(SENTENCE_BREAK)
    .map((sentence) => sentence.trim())
    .filter((sentence) => isBacked(sentence, known));
  if (kept.length === 0) return { answer: NO_BACKED_ANSWER, citations: [] };
  const used = new Set(kept.flatMap(citedIds));
  return {
    answer: kept.join(" "),
    citations: episodes.filter((episode) => used.has(episode.id)).map((episode) => episode.id),
  };
}
