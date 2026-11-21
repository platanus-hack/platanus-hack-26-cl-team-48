import type { NepParams, NepResult } from "@nodomics/protocol";
import { runtimeOf } from "./compile-task.ts";
import { executorAt, type EngineState } from "./engine-state.ts";
import { selectExecutor } from "./select-executor.ts";
import { requireNode, requireSession } from "./session.ts";

const NO_COMPLETIONS: NepResult<"code.complete"> = { items: [] };

/** `code.complete`: asks the executor that would run the node, which knows its libraries. */
export async function completeCode(
  state: EngineState,
  { nodeId, ...position }: NepParams<"code.complete">,
): Promise<NepResult<"code.complete">> {
  const node = requireNode(requireSession(state), nodeId);
  if (runtimeOf(node) !== "python") return NO_COMPLETIONS;
  const executor = selectExecutor(
    { runtime: "python", packages: node.manifest.requires?.packages ?? [] },
    await state.capabilities(),
  );
  return executor.ok
    ? await executorAt(state, executor.value).request("exec.complete", position)
    : NO_COMPLETIONS;
}
