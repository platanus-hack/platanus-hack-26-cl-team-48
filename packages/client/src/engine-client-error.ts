import type { ValidationIssue } from "@nodomics/protocol";

export type EngineClientErrorCode = "INVALID_RESPONSE";

/** The engine broke the NEP contract: a bug on the engine side, not an expected domain error. */
export class EngineClientError extends Error {
  constructor(
    readonly code: EngineClientErrorCode,
    message: string,
    readonly issues: readonly ValidationIssue[],
  ) {
    super(message);
    this.name = "EngineClientError";
  }
}
