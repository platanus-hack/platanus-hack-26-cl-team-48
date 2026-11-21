import { useEffect, useEffectEvent, useState } from "react";
import { useEngineConnection } from "./engine-connection.ts";
import type { EngineSession } from "./engine-session.ts";

export type QueryState<T> =
  | { readonly status: "idle" }
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly value: T }
  | { readonly status: "failed"; readonly error: unknown };

type Answer<T> = { readonly key: string; readonly state: QueryState<T> };

const IDLE = { status: "idle" } as const;
const LOADING = { status: "loading" } as const;

/**
 * Asks the engine for data identified by `key` (a page, a profile, a view) and keeps the latest
 * answer. An `undefined` key means there is nothing to ask for.
 */
export function useEngineQuery<T>(
  key: string | undefined,
  query: (session: EngineSession) => Promise<T>,
): QueryState<T> {
  const connection = useEngineConnection();
  const [answer, setAnswer] = useState<Answer<T> | undefined>(undefined);
  const ask = useEffectEvent(query);
  useEffect(() => {
    if (key === undefined || connection === undefined) return;
    const request = { isCurrent: true };
    const load = async () => {
      const state = await askSafely(() => ask(connection.session));
      if (request.isCurrent) setAnswer({ key, state });
    };
    void load();
    return () => {
      request.isCurrent = false;
    };
  }, [key, connection]);
  if (key === undefined || connection === undefined) return IDLE;
  return answer?.key === key ? answer.state : LOADING;
}

async function askSafely<T>(ask: () => Promise<T>): Promise<QueryState<T>> {
  try {
    return { status: "ready", value: await ask() };
  } catch (error) {
    // An expired result or a lost engine is shown to the user, not thrown at React.
    return { status: "failed", error };
  }
}
