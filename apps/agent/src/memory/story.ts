import { err, ok, type Result } from "@nodomics/protocol";
import type { LlmPort } from "../llm/llm-port.ts";
import type { Edge, Episode, MemoryPort } from "./memory-port.ts";
import { keepCitedSentences, type CitedAnswer } from "./story-citations.ts";
import { buildStoryRequest } from "./story-prompt.ts";

export type StoryDeps = {
  readonly memory: MemoryPort;
  readonly llm: LlmPort;
  readonly now?: () => string;
};

export type StoryQuery = {
  readonly actorId: string;
  readonly componentId: string;
  readonly question: string;
};

export type Story = CitedAnswer & { readonly hasHistory: boolean };

export type StoryError = {
  readonly code: "MEMORY_FAILED" | "LLM_FAILED";
  readonly message: string;
};

export const NO_HISTORY_ANSWER = "No tengo historial de este componente.";

const byTime = (a: Episode, b: Episode): number => a.at.localeCompare(b.at);
const defaultNow = (): string => new Date().toISOString();

type History = { readonly episodes: readonly Episode[]; readonly edges: readonly Edge[] };

async function loadHistory(
  deps: StoryDeps,
  query: StoryQuery,
): Promise<Result<History, StoryError>> {
  const episodes = await deps.memory.episodesFor(query.componentId);
  if (!episodes.ok) return err({ code: "MEMORY_FAILED", message: episodes.error.message });
  const edges = await deps.memory.edgesAt(
    query.componentId,
    (deps.now ?? defaultNow)(),
    query.actorId,
  );
  if (!edges.ok) return err({ code: "MEMORY_FAILED", message: edges.error.message });
  const own = episodes.value.filter((episode) => episode.actorId === query.actorId);
  return ok({ episodes: [...own].sort(byTime), edges: edges.value });
}

async function askLlm(
  deps: StoryDeps,
  query: StoryQuery,
  history: History,
): Promise<Result<Story, StoryError>> {
  const turn = await deps.llm.complete(buildStoryRequest({ question: query.question, ...history }));
  if (!turn.ok) return err({ code: "LLM_FAILED", message: turn.error.message });
  if (turn.value.kind !== "text")
    return err({ code: "LLM_FAILED", message: "Unexpected tool call" });
  return ok({ ...keepCitedSentences(turn.value.text, history.episodes), hasHistory: true });
}

export async function explainWhy(
  deps: StoryDeps,
  query: StoryQuery,
): Promise<Result<Story, StoryError>> {
  const history = await loadHistory(deps, query);
  if (!history.ok) return history;
  if (history.value.episodes.length === 0) {
    return ok({ answer: NO_HISTORY_ANSWER, citations: [], hasHistory: false });
  }
  return askLlm(deps, query, history.value);
}
