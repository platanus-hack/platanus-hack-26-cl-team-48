import { err, type Result } from "@nodomics/protocol";
import type { ComponentCard } from "../contracts/component-card.ts";
import {
  buildComponentCard,
  cardToEmbeddingText,
  type ComponentCardInput,
} from "./component-card.ts";
import type { EmbeddingsPort } from "./embeddings.ts";
import type { SearchIndexPort } from "./search.ts";

export type IndexComponentError = {
  readonly code: "CARD_FAILED" | "EMBED_FAILED" | "INDEX_FAILED";
  readonly message: string;
};

export async function indexComponent(
  deps: { readonly embeddings: EmbeddingsPort; readonly index: SearchIndexPort },
  input: ComponentCardInput,
): Promise<Result<ComponentCard, IndexComponentError>> {
  const card = buildComponentCard(input);
  if (!card.ok) return err({ code: "CARD_FAILED", message: "Component card is invalid." });
  const embedded = await deps.embeddings.embed([cardToEmbeddingText(card.value)]);
  if (!embedded.ok || !embedded.value[0])
    return err({ code: "EMBED_FAILED", message: "Component embedding failed." });
  const stored = await deps.index.upsert(card.value.id, card.value, embedded.value[0]);
  return stored.ok ? card : err({ code: "INDEX_FAILED", message: "Component indexing failed." });
}
