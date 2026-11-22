import { err, ok, type Result } from "@nodomics/protocol";
import type { SandboxReport } from "../import/import-report.ts";
import type { SandboxError, SandboxErrorCode, SandboxPort } from "./sandbox-port.ts";

export function createFakeSandbox(
  fixtureReport?: SandboxReport,
  simulateError?: SandboxErrorCode,
): SandboxPort {
  return {
    runImport: (): Promise<Result<SandboxReport, SandboxError>> => {
      if (simulateError) {
        return Promise.resolve(err({ code: simulateError }));
      }
      if (!fixtureReport) {
        return Promise.resolve(
          err({ code: "REPORT_INVALID", message: "No report fixture provided" }),
        );
      }
      return Promise.resolve(ok(fixtureReport));
    },
  };
}
