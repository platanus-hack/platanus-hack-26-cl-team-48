import {
  err,
  ok,
  type ExecutorCapabilities,
  type NodeError,
  type Result,
  type Runtime,
} from "@nodomics/protocol";

export type ExecutorRequirements = {
  readonly runtime: Runtime;
  readonly packages?: ReadonlyArray<string>;
};

/** Index of the first executor whose capabilities cover the requirements. */
export function selectExecutor(
  requirements: ExecutorRequirements,
  executors: ReadonlyArray<ExecutorCapabilities>,
): Result<number, NodeError> {
  const index = executors.findIndex((executor) => canRun(executor, requirements));
  return index >= 0 ? ok(index) : err(unavailable(requirements));
}

const canRun = (executor: ExecutorCapabilities, requirements: ExecutorRequirements) =>
  executor.runtimes.includes(requirements.runtime) &&
  (requirements.packages ?? []).every((name) => executor.packages?.includes(name) === true);

const unavailable = (requirements: ExecutorRequirements): NodeError => ({
  code: "RUNTIME_UNAVAILABLE",
  message: "Este motor no puede ejecutar el nodo",
  hint: "Conecta un motor que tenga lo que el nodo necesita",
  detail: `runtime: ${requirements.runtime}; packages: ${(requirements.packages ?? []).join(", ")}`,
});
