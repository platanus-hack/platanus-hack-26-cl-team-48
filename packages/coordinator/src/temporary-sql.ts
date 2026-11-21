import { err, ok, type NodeError, type ResultRef, type Result } from "@nodomics/protocol";
import type { CacheKeys } from "./cache-keys.ts";
import type { TaskInputs } from "./compile-task.ts";
import { executorAt, type EngineState } from "./engine-state.ts";
import { findSqlExecutor } from "./sql-executor.ts";
import { resolveTaskInputs } from "./task-inputs.ts";

export type TemporaryQuery = {
  readonly query: string;
  readonly inputs: TaskInputs;
  readonly keys: CacheKeys;
};

/**
 * Runs a helper query (schema inference, view data) on the SQL executor, hands its result to
 * `use`, and releases the result afterwards: it never enters the cache.
 */
export async function withTemporarySql<T>(
  state: EngineState,
  request: TemporaryQuery,
  use: (ref: ResultRef, executor: number) => Promise<T>,
): Promise<Result<T, NodeError>> {
  const executor = await findSqlExecutor(state);
  if (!executor.ok) return executor;
  const inputs = await resolveTaskInputs(state, request.keys, {
    inputs: request.inputs,
    executor: executor.value,
  });
  if (!inputs.ok) return inputs;
  const response = await executorAt(state, executor.value).request("exec.run", {
    taskId: state.createId("task"),
    task: { kind: "sql", query: request.query, inputs: inputs.value },
  });
  if (!response.ok) return err(response.error);
  const refs = Object.values(response.outputs);
  try {
    const [ref] = refs;
    if (ref === undefined) throw new Error("A SQL task returned no result");
    return ok(await use(ref, executor.value));
  } finally {
    await executorAt(state, executor.value).request("exec.drop", {
      resultIds: refs.map((ref) => ref.id),
    });
  }
}
