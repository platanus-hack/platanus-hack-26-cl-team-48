import { err, ok, type NodeError, type Result } from "@nodomics/protocol";
import type { CacheKeys } from "./cache-keys.ts";
import type { TaskInput, TaskInputs } from "./compile-task.ts";
import { executorAt, type EngineState } from "./engine-state.ts";
import type { LocatedResult } from "./result-store.ts";
import { ensureRequestedSource, ensureSource } from "./source-loading.ts";

/** Resolves each task input to the id of a result held by the target executor. */
export async function resolveTaskInputs(
  state: EngineState,
  keys: CacheKeys,
  request: { readonly inputs: TaskInputs; readonly executor: number },
): Promise<Result<Record<string, string>, NodeError>> {
  const resolved: Record<string, string> = {};
  for (const [alias, input] of Object.entries(request.inputs)) {
    const located = await locateInput(state, keys, input);
    if (!located.ok) return located;
    resolved[alias] = await placeOn(state, located.value, request.executor);
  }
  return ok(resolved);
}

/**
 * The id of the result on the target executor. A result held elsewhere is moved as Arrow
 * (opaque to the coordinator) once, and the copy is reused afterwards.
 */
export async function placeOn(
  state: EngineState,
  located: LocatedResult,
  target: number,
): Promise<string> {
  if (located.executor === target) return located.ref.id;
  const existing = state.store.copyOf(located.ref.id, target);
  if (existing !== undefined) return existing.id;
  const { arrow } = await executorAt(state, located.executor).request("exec.export", {
    resultId: located.ref.id,
  });
  const ref = await executorAt(state, target).request("exec.import", { arrow });
  state.store.putCopy(located.ref.id, { executor: target, ref });
  return ref.id;
}

async function locateInput(
  state: EngineState,
  keys: CacheKeys,
  input: TaskInput,
): Promise<Result<LocatedResult, NodeError>> {
  if (input.kind === "source") return ensureSource(state, input.sourceId);
  if (input.kind === "request") return ensureRequestedSource(state, input);
  const cached = state.store.get(keys.get(input.node) ?? "");
  const ref = cached?.outputs[input.port];
  return cached === undefined || ref === undefined
    ? err(missingInput(input.node))
    : ok({ executor: cached.executor, ref });
}

const missingInput = (nodeId: string): NodeError => ({
  code: "INPUT_MISSING",
  message: "Falta el resultado de un nodo anterior",
  hint: "Vuelve a ejecutar el flujo",
  detail: `nodeId: ${nodeId}`,
});
