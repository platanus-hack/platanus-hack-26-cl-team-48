import { err, type Result } from "@nodomics/protocol";
import type { DeployError, DeployErrorCode } from "../types.ts";

export type NodeParams = Readonly<Record<string, unknown>>;

/** A param as trimmed text; empty strings and non-strings count as absent. */
export function textParam(params: NodeParams, key: string): string | undefined {
  const value = params[key];
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

export const failure = (code: DeployErrorCode, message: string): Result<never, DeployError> =>
  err({ code, message });

export const invalidSpec = (message: string): Result<never, DeployError> =>
  failure("INVALID_SPEC", message);
