import type { ImportStatus, Row, SandboxReport, VerificationCase } from "./import-report.ts";
import { compareRows } from "./compare-rows.ts";

export type CaseWithObserved = VerificationCase & {
  readonly observed?: readonly Row[] | undefined;
};

export type ReportWithObserved = Omit<SandboxReport, "cases"> & {
  readonly cases: readonly CaseWithObserved[];
};

export type DecideStatusInput = {
  readonly report: SandboxReport | ReportWithObserved;
  readonly hasPythonNode?: boolean | undefined;
};

function hasValidExpectedBy(c: CaseWithObserved): boolean {
  if ("kind" in c.expectedBy) return true;
  return c.expectedBy.command.trim().length > 0 && c.expectedBy.path.trim().length > 0;
}

function allCasesPass(cases: readonly CaseWithObserved[]): boolean {
  return cases.every((c) => {
    if (!c.observed) return false;
    return compareRows(c.expected, c.observed).equal;
  });
}

export function decideStatus(input: DecideStatusInput): ImportStatus {
  if (input.hasPythonNode || input.report.status === "incompatible") {
    return "incompatible";
  }
  const { cases, outOfScope } = input.report;
  if (cases.length === 0 || !cases.every(hasValidExpectedBy)) {
    return "unverified";
  }
  if (!allCasesPass(cases)) {
    return "unverified";
  }
  return outOfScope.length > 0 ? "partial" : "verified";
}
