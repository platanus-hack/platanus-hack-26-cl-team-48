import { err, ok, parse, type Result } from "@nodomics/protocol";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ComponentCard } from "../contracts/component-card.ts";
import type { SearchError, SearchIndexPort } from "./search.ts";

export type UserScopedSearchConfig = {
  readonly supabaseUrl: string;
  readonly anonKey: string;
  readonly accessToken: string;
};

type ClientFactory = (
  url: string,
  key: string,
  options: {
    readonly global: { readonly headers: Readonly<Record<string, string>> };
    readonly auth: { readonly persistSession: false; readonly autoRefreshToken: false };
  },
) => SupabaseClient;

type Reply = { readonly data: unknown; readonly error: unknown };
const failure = (message: string): Result<never, SearchError> =>
  err({ code: "INDEX_ERROR", message });

export function createUserScopedSearchIndex(
  config: UserScopedSearchConfig,
  factory: ClientFactory = createClient,
): Result<SearchIndexPort, SearchError> {
  if (config.accessToken === "") {
    return failure("A user access token is required for component indexing");
  }
  const client = factory(config.supabaseUrl, config.anonKey, {
    global: { headers: { Authorization: `Bearer ${config.accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return ok(createSupabaseSearchIndex(client));
}

export function createSupabaseSearchIndex(client: SupabaseClient): SearchIndexPort {
  return {
    upsert: (id, card, vector) => upsertCard(client, { id, card, vector }),
    query: (vector, k) => queryCards(client, vector, k),
  };
}

async function upsertCard(
  client: SupabaseClient,
  input: { readonly id: string; readonly card: ComponentCard; readonly vector: readonly number[] },
): Promise<Result<void, SearchError>> {
  try {
    const reply: Reply = await client
      .from("agent_component_cards")
      .upsert({ id: input.id, card: input.card, embedding: JSON.stringify(input.vector) });
    return reply.error ? failure("Component indexing failed.") : ok(undefined);
  } catch {
    return failure("Component indexing failed.");
  }
}

async function queryCards(
  client: SupabaseClient,
  vector: readonly number[],
  k: number,
): Promise<Result<ComponentCard[], SearchError>> {
  try {
    const reply: Reply = await client.rpc("match_agent_components", {
      query: JSON.stringify(vector),
      k,
    });
    return reply.error ? failure("Component search failed.") : parseCards(reply.data);
  } catch {
    return failure("Component search failed.");
  }
}

function parseCards(data: unknown): Result<ComponentCard[], SearchError> {
  if (!Array.isArray(data)) return failure("Component search returned malformed cards.");
  const cards: ComponentCard[] = [];
  const rows: readonly unknown[] = data;
  for (const row of rows) {
    if (typeof row !== "object" || row === null || !("card" in row))
      return failure("Component search returned malformed cards.");
    const parsed = parse(ComponentCard, row.card);
    if (!parsed.ok) return failure("Component search returned malformed cards.");
    cards.push(parsed.value);
  }
  return ok(cards);
}
