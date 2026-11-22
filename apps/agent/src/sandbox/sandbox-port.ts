import type { Result } from "@nodomics/protocol";
import type { SandboxReport } from "../import/import-report.ts";

export type SandboxErrorCode = "SANDBOX_UNAVAILABLE" | "TIMEOUT" | "REPORT_INVALID";

export type SandboxError = {
  readonly code: SandboxErrorCode;
  readonly message?: string;
};

export type SandboxRunInput = {
  readonly jobId: string;
  readonly need: string;
  readonly repo?: string;
  readonly ref?: string;
  readonly jobToken: string;
  readonly agentUrl: string;
  readonly sandboxApiKey: string;
};

export interface SandboxPort {
  runImport(input: SandboxRunInput): Promise<Result<SandboxReport, SandboxError>>;
}
