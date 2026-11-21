import { err, ok, type Result } from "@nodomics/protocol";
import type { ComponentCard } from "../contracts/component-card.ts";
import type { EmbeddingsPort, EmbedError } from "./embeddings.ts";

export type SearchError = { readonly code: "INDEX_ERROR"; readonly message: string };
export interface SearchIndexPort {
  upsert(
    id: string,
    card: ComponentCard,
    vector: readonly number[],
  ): Promise<Result<void, SearchError>>;
  query(vector: readonly number[], k: number): Promise<Result<ComponentCard[], SearchError>>;
}

export function createFakeSearchIndex(): SearchIndexPort {
  const cards = new Map<string, { card: ComponentCard; vector: readonly number[] }>();
  return {
    upsert: (id, card, vector) => {
      cards.set(id, { card, vector: [...vector] });
      return Promise.resolve(ok(undefined));
    },
    query: (vector, k) =>
      Promise.resolve(
        ok(
          [...cards.values()]
            .sort((left, right) => cosine(right.vector, vector) - cosine(left.vector, vector))
            .slice(0, Math.max(0, k))
            .map(({ card }) => card),
        ),
      ),
  };
}

export async function searchComponents(
  deps: { readonly embeddings: EmbeddingsPort; readonly index: SearchIndexPort },
  query: string,
  k: number,
): Promise<Result<ComponentCard[], EmbedError | SearchError>> {
  const embedded = await deps.embeddings.embed([query]);
  if (!embedded.ok) return embedded;
  const vector = embedded.value[0];
  if (!vector)
    return err({ code: "INDEX_ERROR", message: "Embedding provider returned no query vector." });
  return deps.index.query(vector, k);
}

function cosine(left: readonly number[], right: readonly number[]): number {
  if (left.length !== right.length || left.length === 0) return -1;
  const dot = left.reduce((sum, value, index) => sum + value * (right[index] ?? 0), 0);
  const magnitude = Math.hypot(...left) * Math.hypot(...right);
  return magnitude === 0 ? -1 : dot / magnitude;
}
