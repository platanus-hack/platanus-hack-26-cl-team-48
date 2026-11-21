import { Flow, parse } from "@nodomics/protocol";

/** Survives the sign-in redirect in this tab only; never listed in Mis flujos (ADR 0023). */
const PENDING_FLOW_KEY = "nodomics.pendingFlow";

export function keepPendingFlow(storage: Pick<Storage, "setItem">, flow: Flow): void {
  storage.setItem(PENDING_FLOW_KEY, JSON.stringify(flow));
}

export function takePendingFlow(
  storage: Pick<Storage, "getItem" | "removeItem">,
): Flow | undefined {
  const kept = storage.getItem(PENDING_FLOW_KEY);
  storage.removeItem(PENDING_FLOW_KEY);
  if (kept === null) return undefined;
  const flow = parse(Flow, parseJson(kept));
  return flow.ok ? flow.value : undefined;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
