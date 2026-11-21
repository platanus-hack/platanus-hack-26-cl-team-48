import { NepErrorCode, type NepParams, type NepResult } from "@nodomics/protocol";
import { RpcError } from "@nodomics/rpc";
import { executorAt, type EngineState } from "./engine-state.ts";

/** `data.page`: a page of a result, read from the executor that holds it. */
export async function pageData(
  state: EngineState,
  { ref, offset, limit, sort }: NepParams<"data.page">,
): Promise<NepResult<"data.page">> {
  return await executorAt(state, locateRef(state, ref)).request("exec.page", {
    resultId: ref,
    offset,
    limit,
    ...(sort === undefined ? {} : { sort }),
  });
}

/** `data.profile`: column statistics of a result, from the executor that holds it. */
export async function profileData(
  state: EngineState,
  { ref }: NepParams<"data.profile">,
): Promise<NepResult<"data.profile">> {
  return await executorAt(state, locateRef(state, ref)).request("exec.profile", { resultId: ref });
}

/** `data.display`: the bytes of a figure, from the executor that holds it. */
export async function displayData(
  state: EngineState,
  { ref }: NepParams<"data.display">,
): Promise<NepResult<"data.display">> {
  return await executorAt(state, locateRef(state, ref)).request("exec.display", {
    displayId: ref,
  });
}

function locateRef(state: EngineState, ref: string): number {
  const executor = state.store.locate(ref);
  if (executor === undefined)
    throw new RpcError(NepErrorCode.RESULT_EXPIRED, `The result ${ref} is no longer available`);
  return executor;
}
