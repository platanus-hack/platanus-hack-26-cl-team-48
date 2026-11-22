import { err, ok, type Result } from "@nodomics/protocol";
import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

export const DEFAULT_EMBEDDING_MODEL = "voyage-4";
const EMBEDDINGS_URL = "https://api.voyageai.com/v1/embeddings";
const ResponseSchema = Type.Object({
  data: Type.Array(Type.Object({ embedding: Type.Array(Type.Number()) })),
});
export type EmbedError = {
  readonly code: "HTTP_ERROR" | "MALFORMED_RESPONSE" | "NETWORK";
  readonly message: string;
};
export interface EmbeddingsPort {
  embed(texts: readonly string[]): Promise<Result<number[][], EmbedError>>;
}
export type VoyageEmbeddingsOptions = {
  readonly apiKey: string;
  readonly model?: string;
  readonly inputType?: "document" | "query";
  readonly fetch: typeof fetch;
};

export function createVoyageEmbeddings(options: VoyageEmbeddingsOptions): EmbeddingsPort {
  return { embed: async (texts) => requestEmbeddings(options, texts) };
}

async function requestEmbeddings(
  options: VoyageEmbeddingsOptions,
  texts: readonly string[],
): Promise<Result<number[][], EmbedError>> {
  try {
    const response = await options.fetch(EMBEDDINGS_URL, requestOptions(options, texts));
    if (!response.ok)
      return err({
        code: "HTTP_ERROR",
        message: `Embedding request failed (status ${String(response.status)}).`,
      });
    return parseVectors(await response.json(), texts.length);
  } catch {
    return err({ code: "NETWORK", message: "Could not reach embedding provider." });
  }
}

function requestOptions(options: VoyageEmbeddingsOptions, texts: readonly string[]): RequestInit {
  return {
    method: "POST",
    headers: { Authorization: `Bearer ${options.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      input: texts,
      model: options.model ?? DEFAULT_EMBEDDING_MODEL,
      input_type: options.inputType ?? "document",
    }),
  };
}

function parseVectors(payload: unknown, count: number): Result<number[][], EmbedError> {
  if (!Value.Check(ResponseSchema, payload) || payload.data.length !== count) {
    return err({
      code: "MALFORMED_RESPONSE",
      message: "Embedding provider returned invalid vectors.",
    });
  }
  if (
    payload.data.some(
      ({ embedding }) =>
        embedding.length === 0 || embedding.some((value) => !Number.isFinite(value)),
    )
  ) {
    return err({
      code: "MALFORMED_RESPONSE",
      message: "Embedding provider returned invalid vectors.",
    });
  }
  return ok(payload.data.map(({ embedding }) => embedding));
}
