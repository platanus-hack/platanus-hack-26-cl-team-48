import type { NodeError, Result } from "@nodomics/protocol";
import type { EngineState } from "./engine-state.ts";
import { selectExecutor } from "./select-executor.ts";

/** The executor that loads sources, infers schemas and prepares view data. */
export const findSqlExecutor = async (state: EngineState): Promise<Result<number, NodeError>> =>
  selectExecutor({ runtime: "sql" }, await state.capabilities());
